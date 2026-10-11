import { Component, type ReactNode } from 'react';

type ErrorBoundaryProps = { children: ReactNode };
type ErrorBoundaryState = { hasError: boolean };

/** A small, accessible recovery screen for unexpected render or lazy-chunk failures. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  private retry = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-16" role="alert" aria-live="assertive">
          <section className="w-full rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-violet-500">Runway recovery</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight">That screen hit a bump.</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Your browser may have loaded an outdated app chunk. Reload Runway and try again. Your locally saved budget is not intentionally reset by this recovery screen.</p>
            <button type="button" onClick={this.retry} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2">Reload Runway</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
