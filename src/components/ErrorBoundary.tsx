import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected arcane disturbance occurred.',
    };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('ErrorBoundary caught error:', error, info);
  }

  override render() {
    if (this.state.hasError) {
      let friendly = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message) as { error?: string; operationType?: string; path?: string };
        if (parsed.error) {
          friendly = `Archive access error (${parsed.operationType || 'operation'} on ${parsed.path || 'record'}): ${parsed.error}`;
        }
      } catch {
        // Keep plain message
      }

      return (
        <div className="min-h-screen bg-[#120d0a] text-[#f3ead8] flex items-center justify-center p-6">
          <div className="max-w-lg w-full parchment-sheet rounded-xl p-8 border border-[#c99a3b]/40">
            <h2 className="font-display text-2xl font-bold text-[#8c1d24] mb-3">
              Protective Ward Triggered
            </h2>
            <p className="text-sm text-[#3d2b1f] leading-relaxed mb-6">{friendly}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-lg bg-[#8c1d24] text-[#f9f3e6] text-sm font-medium hover:bg-[#73161c] transition-colors cursor-pointer"
            >
              Reload Sanctum
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
