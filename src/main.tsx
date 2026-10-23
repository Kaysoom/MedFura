import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error('UniPortal Runtime Error:', error, errorInfo);
  }

  handleResetAndReload = () => {
    try {
      localStorage.clear();
    } catch {
      // ignore storage errors
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-['Cairo',sans-serif]"
        >
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-right shadow-2xl space-y-4">
            <h1 className="text-lg font-extrabold text-emerald-400">
              حدث خطأ غير متوقع أثناء تحميل الواجهة
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              قد يكون السبب وجود بيانات قديمة مخزنة في المتصفح. يمكنك إعادة ضبط الذاكرة المؤقتة ومتابعة التصفح فوراً.
            </p>
            {this.state.errorMessage && (
              <pre
                dir="ltr"
                className="text-[11px] bg-slate-950 border border-slate-800 rounded-xl p-3 text-rose-300 overflow-x-auto"
              >
                {this.state.errorMessage}
              </pre>
            )}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleResetAndReload}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
              >
                إصلاح وإعادة تشغيل التطبيق
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer"
              >
                تحديث الصفحة
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  );
}
