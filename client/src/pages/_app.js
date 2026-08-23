import React from 'react';
import AppIcon from '../components/ui/AppIcon';
import Head from 'next/head';
import Script from 'next/script';
import '../styles/kinetic-precision.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#06121a] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="kp-card p-8 max-w-md w-full">
            <div className="mb-3"><AppIcon name="warning" size={34} className="mx-auto text-[#ffc75b]" /></div>
            <h2 className="text-xl font-black mb-2">Something Went Wrong</h2>
            <p className="text-xs text-[#ffb4c1] bg-[#2a1017] p-3 rounded-lg border border-[#6b1e2a] font-mono mb-4 text-left overflow-x-auto">
              {this.state.error?.message || 'A client rendering error occurred.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.assign('/');
              }}
              className="kp-button py-2.5 px-5 text-sm w-full"
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App({ Component, pageProps }) {
  return (
    <ErrorBoundary>
      <Head>
        <title>AthleteX</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="AthleteX — Kinetic Precision athlete assessment platform" />
      </Head>
      <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}
