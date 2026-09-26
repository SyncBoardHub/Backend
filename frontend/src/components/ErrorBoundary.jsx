import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0d0c13] px-6 text-white">
        <section className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-purple-300">Something went wrong</p>
          <h1 className="mb-3 text-2xl font-bold">The workspace needs a refresh</h1>
          <p className="mb-6 text-sm leading-6 text-gray-400">Your data is safe. Refresh the page and try the action again.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-3 font-semibold text-white transition hover:from-purple-500 hover:to-blue-500"
          >
            Refresh workspace
          </button>
        </section>
      </main>
    );
  }
}
