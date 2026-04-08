import express, { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { getPromptService } from '../prompt/crud';
import { circuitBreakerRegistry } from './circuit-breaker';
import { failoverManager } from './failover';
import { getUsageTracker } from './usage-tracker';
import { proxyConfigAdapter } from './config-adapter';
import type { AppType } from '@/types';
import log from 'electron-log';

export class ProxyServer {
  private expressApp: express.Application | null = null;
  private server: any = null;
  private isRunningFlag = false;
  private port = 15721;

  /**
   * Initialize the proxy server
   * Sets up failover queues for all apps using getPromptService
   */
  initialize(): void {
    console.log('[ProxyServer] Initializing...');

    try {
      // Initialize prompt service to ensure it's available
      getPromptService();
      const appTypes: AppType[] = ['claude', 'codex', 'gemini', 'opencode', 'openclaw'];

      // Set up failover queues for each app type
      for (const appType of appTypes) {
        try {
          // Get providers from prompt service (this will be used for failover)
          // Note: In a real implementation, providers might come from a different service
          // For now, we'll set up empty queues that will be populated later
          console.log(`[ProxyServer] Setting up failover queue for ${appType}`);
        } catch (error) {
          log.warn(`[ProxyServer] Failed to setup failover queue for ${appType}:`, error);
        }
      }

      console.log('[ProxyServer] Initialization complete');
    } catch (error) {
      log.error('[ProxyServer] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Start the proxy server
   * Creates Express app, sets up middleware, and starts listening
   */
  async start(port?: number): Promise<void> {
    if (this.isRunningFlag) {
      console.log('[ProxyServer] Server is already running');
      return;
    }

    this.port = port || this.port;

    console.log(`[ProxyServer] Starting on port ${this.port}...`);

    this.expressApp = express();

    // Set up middleware
    this.setupMiddleware();

    return new Promise((resolve, reject) => {
      this.server = this.expressApp!.listen(this.port, () => {
        this.isRunningFlag = true;
        console.log(`[ProxyServer] Server started on port ${this.port}`);

        // Enable proxy for all apps
        const proxyUrl = `http://localhost:${this.port}`;
        proxyConfigAdapter.enableForAll(proxyUrl);

        resolve();
      });

      this.server.on('error', (error: Error) => {
        log.error('[ProxyServer] Failed to start server:', error);
        reject(error);
      });
    });
  }

  /**
   * Stop the proxy server
   */
  async stop(): Promise<void> {
    if (!this.isRunningFlag || !this.server) {
      console.log('[ProxyServer] Server is not running');
      return;
    }

    console.log('[ProxyServer] Stopping server...');

    return new Promise((resolve) => {
      // Disable proxy for all apps
      proxyConfigAdapter.disableForAll();

      this.server.close(() => {
        this.isRunningFlag = false;
        this.server = null;
        this.expressApp = null;
        console.log('[ProxyServer] Server stopped');
        resolve();
      });
    });
  }

  /**
   * Check if the server is running
   */
  isRunning(): boolean {
    return this.isRunningFlag;
  }

  /**
   * Configure Express middleware
   */
  private setupMiddleware(): void {
    if (!this.expressApp) return;

    // JSON body parser
    this.expressApp.use(express.json({ limit: '50mb' }));

    // Request logging
    this.expressApp.use((req: Request, _res: Response, next: NextFunction) => {
      console.log(`[ProxyServer] ${req.method} ${req.path} - ${req.ip}`);
      next();
    });

    // Health check endpoint
    this.expressApp.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: Date.now() });
    });

    // Proxy middleware for /v1/* routes
    this.expressApp.use('/v1', this.createProxyHandler());

    // Error handling middleware
    this.expressApp.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      log.error('[ProxyServer] Error:', err);
      res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
      });
    });

    // 404 handler
    this.expressApp.use((_req: Request, res: Response) => {
      res.status(404).json({ error: 'Not Found' });
    });
  }

  /**
   * Create proxy handler middleware
   */
  private createProxyHandler(): express.RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        await this.handleRequest(req, res, next);
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Handle incoming proxy requests
   * Extracts app type, checks circuit breaker, handles failover, and proxies the request
   */
  private async handleRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();

    // Extract app type from headers or path
    const appType = this.extractAppType(req);
    if (!appType) {
      res.status(400).json({ error: 'Missing or invalid app type' });
      return;
    }

    // Get current provider from failover manager
    let providerId = failoverManager.getCurrentProvider(appType);

    if (!providerId) {
      res.status(503).json({ error: 'No available providers' });
      return;
    }

    // Check circuit breaker
    const breaker = circuitBreakerRegistry.get(providerId);

    if (!breaker.canExecute()) {
      console.log(`[ProxyServer] Circuit breaker open for ${providerId}, attempting failover`);

      // Attempt failover
      const newProviderId = failoverManager.failover(appType);

      if (!newProviderId) {
        res.status(503).json({ error: 'Service unavailable - all providers exhausted' });
        return;
      }

      providerId = newProviderId;
    }

    // Get target URL from current provider
    const targetUrl = this.getProviderTargetUrl(providerId);

    if (!targetUrl) {
      res.status(500).json({ error: 'Provider target URL not configured' });
      return;
    }

    // Create proxy middleware for this request
    const proxyOptions: Options = {
      target: targetUrl,
      changeOrigin: true,
      pathRewrite: {
        '^/v1': '', // Remove /v1 prefix when proxying
      },
      on: {
        proxyReq: (proxyReq, _req, _res) => {
          console.log(`[ProxyServer] Proxying to ${targetUrl}${proxyReq.path}`);
        },
        proxyRes: (proxyRes, _req, _res) => {
          const duration = Date.now() - startTime;

          // Track successful request
          if (proxyRes.statusCode && proxyRes.statusCode < 400) {
            breaker.recordSuccess();
            this.trackUsage(appType, providerId, req, duration, true);
          } else {
            breaker.recordFailure();
            this.trackUsage(
              appType,
              providerId,
              req,
              duration,
              false,
              `HTTP ${proxyRes.statusCode}`
            );
          }
        },
        error: (err, _req, _res) => {
          const duration = Date.now() - startTime;

          console.error(`[ProxyServer] Proxy error:`, err);
          breaker.recordFailure();
          this.trackUsage(appType, providerId, req, duration, false, err.message);

          // Attempt failover on error
          failoverManager.failover(appType);
        },
      },
    };

    const proxyMiddleware = createProxyMiddleware(proxyOptions);
    proxyMiddleware(req, res, next);
  }

  /**
   * Extract app type from request headers or path
   */
  private extractAppType(req: Request): AppType | null {
    // Try to get from header first
    const appTypeHeader = req.headers['x-app-type'] as string;
    if (appTypeHeader) {
      const validAppTypes: AppType[] = ['claude', 'codex', 'gemini', 'opencode', 'openclaw'];
      if (validAppTypes.includes(appTypeHeader as AppType)) {
        return appTypeHeader as AppType;
      }
    }

    // Try to infer from User-Agent or other headers
    const userAgent = req.headers['user-agent'] || '';
    if (userAgent.toLowerCase().includes('claude')) return 'claude';
    if (userAgent.toLowerCase().includes('codex')) return 'codex';
    if (userAgent.toLowerCase().includes('gemini')) return 'gemini';
    if (userAgent.toLowerCase().includes('opencode')) return 'opencode';
    if (userAgent.toLowerCase().includes('openclaw')) return 'openclaw';

    // Default to opencode if can't determine
    return 'opencode';
  }

  /**
   * Get the target URL for a provider
   * This should be implemented to fetch from provider configuration
   */
  private getProviderTargetUrl(providerId: string): string | null {
    // For now, return a placeholder. In real implementation, this would
    // fetch from provider configuration
    const providerUrls: Record<string, string> = {
      openai: 'https://api.openai.com',
      anthropic: 'https://api.anthropic.com',
      gemini: 'https://generativelanguage.googleapis.com',
    };

    return providerUrls[providerId] || null;
  }

  /**
   * Track usage for a request
   */
  private trackUsage(
    appType: AppType,
    providerId: string,
    req: Request,
    durationMs: number,
    success: boolean,
    errorMessage?: string
  ): void {
    try {
      const usageTracker = getUsageTracker();

      // Extract model from request body if available
      const model = req.body?.model || 'unknown';
      const requestType = this.getRequestType(req);

      // Estimate tokens (this is a simplified estimation)
      const tokensInput = this.estimateTokens(JSON.stringify(req.body));
      const tokensOutput = 0; // Will be updated when response is received

      // Calculate cost (simplified)
      const costUsd = this.calculateCost(providerId, model, tokensInput, tokensOutput);

      usageTracker.logRequest({
        timestamp: Date.now(),
        appType,
        providerId,
        model,
        requestType,
        tokensInput,
        tokensOutput,
        costUsd,
        durationMs,
        success,
        errorMessage,
      });
    } catch (error) {
      log.error('[ProxyServer] Failed to track usage:', error);
    }
  }

  /**
   * Determine request type from path
   */
  private getRequestType(req: Request): string {
    const path = req.path.toLowerCase();
    if (path.includes('chat')) return 'chat';
    if (path.includes('completion')) return 'completion';
    if (path.includes('embedding')) return 'embedding';
    if (path.includes('model')) return 'models';
    return 'other';
  }

  /**
   * Estimate token count from text
   * Simple approximation: ~4 characters per token
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate cost based on provider and token usage
   * Simplified cost calculation
   */
  private calculateCost(
    _providerId: string,
    _model: string,
    tokensInput: number,
    tokensOutput: number
  ): number {
    // Simplified: $0.002 per 1K tokens input, $0.006 per 1K tokens output
    const inputCost = (tokensInput / 1000) * 0.002;
    const outputCost = (tokensOutput / 1000) * 0.006;
    return inputCost + outputCost;
  }
}

// Singleton instance
let proxyServerInstance: ProxyServer | null = null;

/**
 * Initialize the proxy server singleton
 */
export function initializeProxyServer(): ProxyServer {
  if (!proxyServerInstance) {
    proxyServerInstance = new ProxyServer();
    proxyServerInstance.initialize();
  }
  return proxyServerInstance;
}

/**
 * Get the proxy server instance
 * Throws if not initialized
 */
export function getProxyServer(): ProxyServer {
  if (!proxyServerInstance) {
    throw new Error('ProxyServer not initialized. Call initializeProxyServer first.');
  }
  return proxyServerInstance;
}

export default ProxyServer;
