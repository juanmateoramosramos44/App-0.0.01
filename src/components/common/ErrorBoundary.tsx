import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  sectionTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-4 text-slate-100">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h2 className="text-base sm:text-lg font-bold text-white">
              {this.props.sectionTitle 
                ? `Detalle al cargar ${this.props.sectionTitle}`
                : 'Detalle al cargar esta sección'}
            </h2>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Tus datos, inventario y registros técnicos están 100% seguros y respaldados. Puedes reintentar cargar esta sección sin perder información.
            </p>

            {this.state.error && (
              <div className="bg-slate-950/80 p-3 rounded-xl text-left border border-slate-800 max-h-24 overflow-y-auto">
                <p className="text-[11px] font-mono text-amber-300 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reintentar Sección</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <span>Recargar</span>
              </button>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('hotel_maint_explicit_logout');
                    localStorage.removeItem('hotel_maint_current_user');
                    sessionStorage.clear();
                  } catch {}
                  window.location.href = '/';
                }}
                className="text-[11px] text-slate-400 hover:text-cyan-400 underline transition-colors cursor-pointer"
              >
                Restablecer sesión y entrar al sistema
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
