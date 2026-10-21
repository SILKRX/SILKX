import { useRouter } from 'expo-router';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { monitoring } from '@/lib/monitoring';

import { ErrorFallback } from './ErrorFallback';

interface Props {
  children: ReactNode;
  scope: string;
}

interface State {
  error: Error | null;
}

/** Классический Error Boundary для провайдеров и виджетов вне маршрутов. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    monitoring.captureException(error, { scope: this.props.scope, componentStack: info.componentStack ?? undefined });
  }

  private reset = () => this.setState({ error: null });

  override render(): ReactNode {
    if (this.state.error) return <ErrorFallback onRetry={this.reset} details={this.state.error.message} />;
    return this.props.children;
  }
}

interface RouteErrorBoundaryProps {
  error: Error;
  retry: () => Promise<void>;
}

/**
 * Error Boundary для Expo Router: экспортируется из layout/экранов как `ErrorBoundary`.
 * Падение одного экрана не роняет приложение — показываем экран восстановления.
 */
export function RouteErrorBoundary({ error, retry }: RouteErrorBoundaryProps) {
  const router = useRouter();
  monitoring.captureException(error, { scope: 'route' });
  return (
    <ErrorFallback
      details={error.message}
      onRetry={() => {
        void retry();
      }}
      onGoHome={() => router.replace('/')}
    />
  );
}
