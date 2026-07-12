import { Component, type ReactNode } from "react";
import { restoreLocalBackup } from "../lib/cloudSave";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/**
 * Rete di sicurezza root: se un errore React sfugge (es. un JSON.parse su
 * localStorage corrotto non intercettato altrove), qui si mostra una
 * schermata cortese invece dello schermo bianco. MAI `localStorage.clear()`:
 * "Ripristina backup" chiama SOLO `restoreLocalBackup()`, che riscrive le
 * chiavi di gioco dall'ultimo backup senza cancellare nulla se il backup non
 * esiste.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error("[ErrorBoundary] errore intercettato:", error, info);
  }

  private retry = () => {
    window.location.reload();
  };

  private restore = () => {
    // Best-effort: se non c'è un backup, il reload da solo è comunque il
    // fallback più sicuro (non peggiora nulla, non tocca lo storage).
    restoreLocalBackup();
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-dvh w-full flex flex-col items-center justify-center text-slate-100 gap-4 p-6 text-center bg-slate-950">
        <div className="text-5xl" aria-hidden="true">🐄💫</div>
        <h1 className="text-lg font-mono font-black text-rose-400">Qualcosa si è inceppato</h1>
        <p className="text-sm text-slate-400 max-w-sm">
          Vatsamon ha incontrato un errore imprevisto. Prova a ricaricare, oppure
          ripristina l'ultimo backup locale se il problema persiste.
        </p>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <button
            onClick={this.retry}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#0b0820] font-mono font-black text-sm py-3 rounded-xl"
          >
            Riprova
          </button>
          <button
            onClick={this.restore}
            className="w-full bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-2.5 rounded-xl"
          >
            Ripristina backup
          </button>
        </div>
      </div>
    );
  }
}
