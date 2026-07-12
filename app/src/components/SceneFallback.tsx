/** Fallback Suspense uniforme per le scene lazy: spinner coerente col resto dell'app. */
export function SceneFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0820]/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2 text-slate-300">
        <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-emerald-400 animate-spin" />
        <span className="text-[11px] font-mono uppercase tracking-widest">Caricamento…</span>
      </div>
    </div>
  );
}
