import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} retry={this.handleRetry} />;
      }

      return <DefaultErrorFallback error={this.state.error!} retry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error;
  retry: () => void;
}

export function DefaultErrorFallback({ error, retry }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl text-gray-900">Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-100 rounded-lg p-3">
            <p className="text-sm text-gray-600 font-mono break-all">
              {error.message || 'An unexpected error occurred'}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={retry} className="flex-1 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'} 
              className="flex-1 flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Button>
          </div>
          
          <details className="mt-4">
            <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
              Technical Details
            </summary>
            <pre className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-auto">
              {error.stack}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}

export function NetworkErrorFallback({ error, retry }: ErrorFallbackProps) {
  return (
    <div className="error-state text-center py-8">
      <AlertTriangle className="w-8 h-8 mx-auto mb-4 text-red-600" />
      <h3 className="text-lg font-medium mb-2">Network Connection Error</h3>
      <p className="text-gray-600 mb-4">
        Unable to connect to the server. Please check your internet connection.
      </p>
      <Button onClick={retry} variant="outline" className="flex items-center gap-2 mx-auto">
        <RefreshCw className="w-4 h-4" />
        Retry Connection
      </Button>
    </div>
  );
}

export function DeviceDiscoveryErrorFallback({ error, retry }: ErrorFallbackProps) {
  return (
    <div className="warning-state text-center py-6">
      <AlertTriangle className="w-6 h-6 mx-auto mb-3 text-yellow-600" />
      <h3 className="font-medium mb-2">Device Discovery Failed</h3>
      <p className="text-sm text-gray-600 mb-4">
        {error.message.includes('permission') 
          ? 'Network permissions required. Please ensure the application has network access.'
          : 'Unable to scan for devices. This may be due to network configuration or permissions.'
        }
      </p>
      <Button onClick={retry} size="sm" className="flex items-center gap-2 mx-auto">
        <RefreshCw className="w-4 h-4" />
        Retry Scan
      </Button>
    </div>
  );
}

export function MappingErrorFallback({ error, retry }: ErrorFallbackProps) {
  return (
    <div className="error-state text-center py-6">
      <AlertTriangle className="w-6 h-6 mx-auto mb-3 text-red-600" />
      <h3 className="font-medium mb-2">Mapping Error</h3>
      <p className="text-sm text-gray-600 mb-4">
        {error.message.includes('floorplan') 
          ? 'Invalid floorplan data. Please check the floorplan configuration.'
          : 'Unable to render the device map. Please try refreshing the view.'
        }
      </p>
      <div className="flex gap-2 justify-center">
        <Button onClick={retry} size="sm" variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
        <Button onClick={() => window.location.reload()} size="sm">
          Refresh Page
        </Button>
      </div>
    </div>
  );
}