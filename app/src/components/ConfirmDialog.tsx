import { motion } from "motion/react";

/**
 * Modale di conferma/avviso riusabile — sostituisce i `window.confirm()` /
 * `alert()` sparsi nei flussi core (bloccano l'intera pagina, fuori stile).
 * Stesso pattern degli altri modali dell'app: backdrop cliccabile + card con
 * stopPropagation (vedi `battle/MossaInfoSheet.tsx`).
 *
 * Senza `onCancel` si comporta come un `alert()`: un solo bottone di
 * conferma/chiusura. Con `onCancel` si comporta come un `window.confirm()`.
 */
export interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Evidenzia il bottone di conferma come azione distruttiva (rosso). */
  danger?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Annulla",
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const hasCancel = !!onCancel;
  return (
    <div
      className="fixed inset-0 bg-slate-950/90 z-[95] flex items-end sm:items-center justify-center p-4 backdrop-blur-xs"
      onClick={() => { (onCancel ?? onConfirm)(); }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-slate-900 border-2 border-slate-700 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div id="confirm-dialog-title" className={`text-base font-mono font-black ${danger ? "text-rose-400" : "text-slate-100"}`}>
            {title}
          </div>
          <p className="text-[12px] text-slate-300 leading-snug mt-1.5 whitespace-pre-line">{message}</p>
        </div>
        <div className="flex gap-2">
          {hasCancel && (
            <button
              onClick={onCancel}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono font-bold text-xs py-2.5 rounded-xl min-h-[44px]"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`flex-1 font-mono font-black text-xs py-2.5 rounded-xl min-h-[44px] ${danger ? "bg-rose-600 hover:bg-rose-500 text-white" : "nav-active text-white"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
