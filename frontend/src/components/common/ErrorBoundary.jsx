import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background dark:bg-background px-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-brown dark:text-cream mb-4">Something went wrong.</h1>
            <p className="text-muted dark:text-mutedtext mb-6">Try refreshing the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-coral text-white rounded-lg font-semibold text-sm hover:bg-coral/90 transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
