import { Component } from 'react';

// Catches render-time errors anywhere below it so a single broken component
// shows a fallback instead of unmounting the whole app to a blank screen.
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-gray-500">Please refresh the page and try again.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
