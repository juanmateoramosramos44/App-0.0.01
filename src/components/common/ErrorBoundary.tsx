import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (React.Component as unknown as {
  new (props: Props): {
    props: Props;
    state: State;
    setState(state: Partial<State>): void;
    render(): ReactNode;
  };
}) {
  public state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // If it's a quota exceeded error, automatically free up bloated local storage
    if (error && (error.name === 'QuotaExceededError' || (error.message && error.message.includes('quota')))) {
      try {
        const keysToClean = [
          'hotel_maint_active_round',
          'hotel_maint_audit_logs',
          'hotel_doc_folders',
          'hotel_maint_documents'
        ];
        for (const key of keysToClean) {
          localStorage.removeItem(key);
        }
      } catch (e) {
        console.warn('Could not auto-clean on ErrorBoundary:', e);
      }
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleClearStorageAndReload = () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-slate-100">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h2 className="text-lg font-bold text-white">
              Ha ocurrido un detalle al cargar esta sección
            </h2>
            
            <p className="text-xs text-slate-300">
              No te preocupes, tus datos no se han perdido. Pulsa el botón para recargar la aplicación rápidamente.
            </p>

            {this.state.error && (
              <div className="bg-slate-950/80 p-3 rounded-xl text-left border border-slate-800 max-h-32 overflow-y-auto">
                <p className="text-[11px] font-mono text-rose-300 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Recargar Aplicación</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearStorageAndReload}
                className="py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold transition-all"
                title="Limpiar datos dañados y restaurar valores por defecto"
              >
                <span>Restaurar Datos</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
