import React, { Component, ErrorInfo, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PopoutOverlay } from './components/PopoutOverlay.tsx'

console.log("Current path:", window.location.pathname);
const isPopout = window.location.pathname.startsWith('/popout');

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'red', padding: '20px', background: 'white' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.toString()}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (isPopout) {
  // Force background immediately
  document.body.style.backgroundColor = 'transparent';
  if (rootElement) rootElement.style.backgroundColor = 'transparent';
}

createRoot(rootElement!).render(
  <ErrorBoundary>
    {isPopout ? <PopoutOverlay /> : <App />}
  </ErrorBoundary>,
)
