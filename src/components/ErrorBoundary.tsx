/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'Unknown error' };
  }

  componentDidCatch(error: Error) {
    console.error('UI runtime error:', error);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#0f1115] text-white flex items-center justify-center">
          <div className="max-w-xl p-6 border border-red-500/40 bg-[#1a1f2a] rounded">
            <h2 className="text-lg font-bold mb-2">Simulation UI recovered from an error</h2>
            <p className="text-sm text-white/80 mb-4">
              The app hit a runtime issue and was safely stopped instead of showing a blank white page.
            </p>
            <pre className="text-xs text-red-200 bg-black/40 p-2 rounded overflow-auto mb-4">
              {this.state.message}
            </pre>
            <button
              onClick={this.handleReload}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm"
            >
              Reload Simulation
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
