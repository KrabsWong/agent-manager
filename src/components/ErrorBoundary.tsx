/**
 * Error Boundary Component
 *
 * Catches JavaScript errors in child components and displays a fallback UI
 */

import { Component, type ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import i18n from '@/lib/i18n';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Here you could send error to analytics service
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                {i18n.t('errorBoundary.title')}
              </h1>
              <p className="text-muted-foreground">{i18n.t('errorBoundary.description')}</p>
            </div>

            {this.state.error && (
              <div className="bg-muted rounded-lg p-4 text-left overflow-auto">
                <p className="text-xs font-mono text-destructive">{this.state.error.toString()}</p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={this.handleGoHome} className="gap-2">
                <Home className="w-4 h-4" />
                {i18n.t('errorBoundary.goHome')}
              </Button>
              <Button onClick={this.handleReload} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                {i18n.t('errorBoundary.reloadPage')}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Route Error Component
 *
 * For use with React Router's errorElement
 */
export function RouteError() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            {i18n.t('errorBoundary.pageNotFoundTitle')}
          </h1>
          <p className="text-muted-foreground">{i18n.t('errorBoundary.pageNotFoundDescription')}</p>
        </div>

        <Button onClick={() => (window.location.href = '/')} className="gap-2">
          <Home className="w-4 h-4" />
          {i18n.t('errorBoundary.goHome')}
        </Button>
      </div>
    </div>
  );
}
