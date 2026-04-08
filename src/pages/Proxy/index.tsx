/**
 * Proxy Dashboard Page
 *
 * Comprehensive proxy control panel with status monitoring,
 * circuit breaker management, usage analytics, and recent logs.
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Play,
  Square,
  RotateCcw,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Server,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UsageChart } from '@/components/proxy/UsageChart';
import {
  useProxyStatus,
  useTodayStats,
  useCircuitBreakerStats,
  useUsageStats,
  useRecentLogs,
  useStartProxy,
  useStopProxy,
  useResetCircuitBreaker,
} from '@/hooks/useProxy';

// Helper to format date
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Helper to format timestamp
const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('zh-CN');
};

// Helper to format cost
const formatCost = (cost: number): string => {
  return `$${cost.toFixed(4)}`;
};

// Proxy Status Card Component
function ProxyStatusCard({
  isRunning,
  port,
  onStart,
  onStop,
  isLoading,
}: {
  isRunning: boolean;
  port: number;
  onStart: () => void;
  onStop: () => void;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Server className="h-4 w-4" />
          {t('proxy.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('proxy.title')}</span>
            <Badge variant={isRunning ? 'default' : 'secondary'}>
              {isRunning ? t('proxy.status.running') : t('proxy.status.stopped')}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Port</span>
            <span className="text-sm font-medium">{port}</span>
          </div>
          <div className="flex gap-2 pt-2">
            {isRunning ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={onStop}
                disabled={isLoading}
                className="flex-1"
              >
                <Square className="h-4 w-4 mr-1" />
                {t('proxy.stop')}
              </Button>
            ) : (
              <Button size="sm" onClick={onStart} disabled={isLoading} className="flex-1">
                <Play className="h-4 w-4 mr-1" />
                {t('proxy.start')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Stats Card Component
function StatsCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

// Circuit Breaker Card Component
function CircuitBreakerCard({
  providerId,
  state,
  failures,
  successes,
  onReset,
  isResetting,
}: {
  providerId: string;
  state: string;
  failures: number;
  successes: number;
  onReset: () => void;
  isResetting: boolean;
}) {
  const { t } = useTranslation();
  const getStateColor = (s: string) => {
    switch (s.toLowerCase()) {
      case 'closed':
        return 'bg-green-500';
      case 'open':
        return 'bg-red-500';
      case 'half-open':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStateVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (s.toLowerCase()) {
      case 'closed':
        return 'default';
      case 'open':
        return 'destructive';
      case 'half-open':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full ${getStateColor(state)}`} />
      <CardHeader className="pb-2 pl-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium truncate" title={providerId}>
            {providerId}
          </CardTitle>
          <Badge variant={getStateVariant(state)} className="text-xs">
            {state.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pl-4">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="text-center p-2 bg-muted rounded">
            <div className="text-lg font-semibold text-green-600">{successes}</div>
            <div className="text-xs text-muted-foreground">{t('proxy.requests')}</div>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <div className="text-lg font-semibold text-red-600">{failures}</div>
            <div className="text-xs text-muted-foreground">{t('proxy.cost')}</div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          disabled={isResetting}
          className="w-full"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          {t('proxy.circuitBreaker')}
        </Button>
      </CardContent>
    </Card>
  );
}

// Alert Component
function Alert({
  variant = 'default',
  children,
}: {
  variant?: 'default' | 'destructive';
  children: React.ReactNode;
}) {
  return (
    <div
      className={`p-4 rounded-lg flex items-start gap-3 ${
        variant === 'destructive'
          ? 'bg-destructive/10 text-destructive border border-destructive/20'
          : 'bg-muted text-foreground border'
      }`}
    >
      <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="text-sm">{children}</div>
    </div>
  );
}

// Main Proxy Page Component
export function ProxyPage() {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<'7days' | '30days'>('7days');

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (dateRange === '7days' ? 7 : 30));
    return {
      startDate: formatDate(start),
      endDate: formatDate(end),
    };
  }, [dateRange]);

  // Queries
  const { data: status, isLoading: isStatusLoading, error: statusError } = useProxyStatus();
  const {
    data: todayStats,
    isLoading: isTodayStatsLoading,
    error: todayStatsError,
  } = useTodayStats();
  const {
    data: circuitBreakers,
    isLoading: isCircuitBreakersLoading,
    error: circuitBreakersError,
  } = useCircuitBreakerStats();
  const {
    data: usageStats,
    isLoading: isUsageStatsLoading,
    error: usageStatsError,
  } = useUsageStats(startDate, endDate);
  const { data: recentLogs, isLoading: isLogsLoading, error: logsError } = useRecentLogs(50);

  // Mutations
  const startProxy = useStartProxy();
  const stopProxy = useStopProxy();
  const resetCircuitBreaker = useResetCircuitBreaker();

  const handleStart = () => startProxy.mutate();
  const handleStop = () => stopProxy.mutate();
  const handleResetCircuitBreaker = (providerId: string) => {
    resetCircuitBreaker.mutate(providerId);
  };

  // Errors
  const errors = [
    statusError,
    todayStatsError,
    circuitBreakersError,
    usageStatsError,
    logsError,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('proxy.title')}</h1>
        <p className="text-muted-foreground">{t('proxy.description')}</p>
      </div>

      {/* Error Alerts */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <Alert key={index} variant="destructive">
              {error instanceof Error ? error.message : 'An error occurred'}
            </Alert>
          ))}
        </div>
      )}

      {/* Status Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {t('proxy.status.running')}
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {isStatusLoading ? (
            <Card className="md:col-span-3">
              <CardContent className="p-6 text-center text-muted-foreground">
                {t('proxy.status.running')}
              </CardContent>
            </Card>
          ) : status ? (
            <>
              <ProxyStatusCard
                isRunning={status.isRunning}
                port={status.port}
                onStart={handleStart}
                onStop={handleStop}
                isLoading={startProxy.isPending || stopProxy.isPending}
              />
              <StatsCard
                title={t('proxy.requests')}
                value={isTodayStatsLoading ? '-' : (todayStats?.requests ?? 0)}
                icon={TrendingUp}
                description={t('proxy.requests')}
              />
              <StatsCard
                title={t('proxy.cost')}
                value={isTodayStatsLoading ? '-' : formatCost(todayStats?.cost ?? 0)}
                icon={DollarSign}
                description={t('proxy.cost')}
              />
            </>
          ) : null}
        </div>
      </section>

      {/* Circuit Breakers Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('proxy.circuitBreaker')}</h2>
        {isCircuitBreakersLoading ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {t('proxy.circuitBreaker')}
            </CardContent>
          </Card>
        ) : circuitBreakers && Object.keys(circuitBreakers).length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Object.entries(circuitBreakers).map(([providerId, stats]) => (
              <CircuitBreakerCard
                key={providerId}
                providerId={providerId}
                state={stats.state}
                failures={stats.failures}
                successes={stats.successes}
                onReset={() => handleResetCircuitBreaker(providerId)}
                isResetting={resetCircuitBreaker.isPending}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {t('proxy.circuitBreaker')}
            </CardContent>
          </Card>
        )}
      </section>

      {/* Usage Charts Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('proxy.requests')}</h2>
          <Select
            value={dateRange}
            onValueChange={(value) => setDateRange(value as '7days' | '30days')}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">7 days</SelectItem>
              <SelectItem value="30days">30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isUsageStatsLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                {t('proxy.requests')}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                {t('proxy.cost')}
              </CardContent>
            </Card>
          </div>
        ) : usageStats && usageStats.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <UsageChart data={usageStats} type="requests" />
            <UsageChart data={usageStats} type="cost" />
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {t('proxy.requests')}
            </CardContent>
          </Card>
        )}
      </section>

      {/* Recent Logs Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t('proxy.status.running')}
        </h2>
        <Card>
          <CardContent className="p-0">
            {isLogsLoading ? (
              <div className="p-6 text-center text-muted-foreground">
                {t('proxy.status.running')}
              </div>
            ) : recentLogs && recentLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 text-sm font-medium">Time</th>
                      <th className="text-left p-4 text-sm font-medium">Provider</th>
                      <th className="text-left p-4 text-sm font-medium">Status</th>
                      <th className="text-right p-4 text-sm font-medium">{t('proxy.cost')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLogs.slice(0, 10).map((log, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="p-4 text-sm">{formatTimestamp(log.timestamp)}</td>
                        <td className="p-4 text-sm font-medium">{log.providerId}</td>
                        <td className="p-4">
                          <Badge
                            variant={log.success ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {log.success ? t('proxy.status.running') : t('proxy.status.stopped')}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm text-right">{formatCost(log.costUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                {t('proxy.status.stopped')}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
