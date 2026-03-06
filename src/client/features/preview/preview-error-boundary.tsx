"use client";

import React, { Component, ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export default class PreviewErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("PreviewPanel rendering error:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center bg-[var(--app-bg-soft)] p-6">
          <div className="max-w-sm text-center">
            <p className="text-base font-semibold text-[var(--app-text-heading)]">
              Preview failed to render
            </p>
            <p className="mt-2 text-sm text-[var(--app-text-muted)]">
              The generated HTML may be invalid. Try regenerating.
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="mt-4 rounded-lg bg-[var(--app-btn-primary-bg)] px-4 py-2 text-sm font-semibold text-[var(--app-btn-primary-text)] transition hover:bg-[var(--app-btn-primary-hover)]"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
