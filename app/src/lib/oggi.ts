/**
 * La data "di gioco". Normalmente è oggi; il parametro `?oggi=YYYY-MM-DD`
 * permette il time-travel della stagione — utile per i test E2E e per le
 * DEMO (mostrare all'associazione come sarà l'app il giorno della finale).
 */
export function oggiISO(): string {
  try {
    const q = new URLSearchParams(window.location.search).get("oggi");
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
  } catch { /* SSR/ambienti senza location */ }
  return new Date().toISOString().slice(0, 10);
}
