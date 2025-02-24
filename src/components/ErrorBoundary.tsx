import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-[400px] flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h3>
            <p className="text-sm text-gray-600">{this.state.error?.message}</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 