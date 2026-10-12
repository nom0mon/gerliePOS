import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Catches render-time errors anywhere below it and shows a recoverable
 * message instead of a blank white screen (important on a kiosk-style POS).
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-shell">
          <header className="app-header">Mommy POS</header>
          <main className="app-main">
            <h1 className="page-title">Something went wrong</h1>
            <p className="muted">{this.state.error.message}</p>
            <button
              type="button"
              className="btn"
              onClick={() => window.location.reload()}
            >
              Reload app
            </button>
          </main>
        </div>
      );
    }
    return this.props.children;
  }
}
