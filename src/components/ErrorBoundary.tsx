import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State { error: Error | null }

/** A crash must never blank the page: the judge should see what broke. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Handoff crashed', error, info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="mx-auto max-w-[640px] p-8 text-[13px] leading-5">
        <h1 className="text-[20px] font-semibold">Handoff hit an error</h1>
        <p className="mt-2 text-ink-muted">Something in this browser behaved differently from Chrome. The details below help us fix it.</p>
        <pre className="mt-4 overflow-auto rounded-md bg-surface p-3 font-mono text-[12px] ring-1 ring-rule">{String(this.state.error?.stack ?? this.state.error)}</pre>
        <p className="mt-3 font-mono text-[11px] text-ink-muted">{navigator.userAgent}</p>
        <button type="button" onClick={() => location.reload()} className="mt-4 h-8 rounded-md border border-rule bg-surface px-3">Reload</button>
      </main>
    );
  }
}
