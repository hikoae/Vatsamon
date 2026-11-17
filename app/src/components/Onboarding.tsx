/**
 * Creazione del personaggio al primo accesso (un solo flusso, 4 passi):
 *  1) Nome allenatore  2) Avatar  3) Valle d'origine  4) Reina starter.
 *
 * Al termine scrive le chiavi localStorage iniziali (lette poi dal monolite
 * App.tsx), salva il profilo su Firestore e fa il primo salvataggio cloud.
 *
 * LAYOUT (2026-07): la card non supera mai l'altezza utile dello schermo,
 * safe-area inclusa. Su schermo ALTO (verticale) avanzamento in alto e barra
 * Indietro/Avanti in basso restano fissi ai due estremi della card; scorre
 * solo il contenuto in mezzo, così la CTA è sempre a portata di pollice anche
 * al passo "Valle" (prima finiva 656px sotto la piega).
 *
 * Su schermo BASSO (iPhone in orizzontale, o tastiera aperta — vedi
 * `useViewportBasso`) quella testata fissa non ci sta: misurato a 852×393 con
 * fasce 59/34 la card è alta 268px mentre stepper + marchio + barra bottoni ne
 * chiedevano 273,8, tutti `shrink-0`. Risultato: il campo nome finiva sotto la
 * barra dei bottoni e il primo passo era un vicolo cieco. In compatto resta
 * fissa la SOLA barra dei bottoni (68px: i due bottoni si affiancano) e scorre
 * tutto il resto, marchio e avanzamento compresi; il marchio si stringe su una
 * riga, così a 268px il campo nome è visibile senza nemmeno scorrere.
 */
import { useEffect, useState } from "react";
import { ChevronRight, ChevronLeft, Check, Loader2 } from "lucide-react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, firebaseEnabled } from "../lib/firebase";
import { saveCloudSave } from "../lib/cloudSave";
import { useAuth } from "../lib/auth";
import { AVATARS, VALLEYS, STARTERS, type AvatarPreset } from "../data/starters";
import { VALUTE } from "../data/economy";
import { CowVisual } from "./CowVisual";
import { avviaTutorialAlProssimoAvvio } from "../lib/tutorial";
import { BRAND } from "../config/brand";
import { Vatsamon, Trainer } from "../types";

const STEPS = ["Nome", "Avatar", "Valle", "Starter"] as const;

/** Soglia "schermo basso". 620px passa in verticale su qualunque iPhone (il più
 *  corto è 667px) e non passa mai in orizzontale (il più alto è 430px), quindi
 *  separa esattamente i due casi. Vale anche quando la tastiera accorcia il
 *  viewport: il layout compatto è quello che serve in entrambe le situazioni. */
const VIEWPORT_BASSO = "(max-height: 620px)";

function useViewportBasso() {
  const [basso, setBasso] = useState(
    () => typeof window !== "undefined" && window.matchMedia(VIEWPORT_BASSO).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(VIEWPORT_BASSO);
    const aggiorna = () => setBasso(mq.matches);
    aggiorna(); // rotazione avvenuta fra il primo render e l'effetto
    mq.addEventListener("change", aggiorna);
    return () => mq.removeEventListener("change", aggiorna);
  }, []);
  return basso;
}

/** Oltre questa lunghezza il nome viene accorciato dall'intestazione di gioco
 *  (`truncate` sul chip identità in App.tsx, per giunta in maiuscolo). Non è un
 *  limite: il nome resta intero nel salvataggio e nel Profilo, qui avvisiamo e
 *  basta — tagliare a 10 caratteri rifiuterebbe nomi veri tipo "Massimiliano". */
const NOME_ACCORCIATO_OLTRE = 10;

/** Due avatar si chiamano entrambi "Alpinista" e si distinguono solo per
 *  l'emoji (🧗‍♀️ / 🧗‍♂️): una differenza che non arriva a chi usa uno screen
 *  reader né a chi non distingue i glifi. Il genere è già dentro l'id
 *  (`alpinista_f` / `alpinista_m`), quindi lo esplicitiamo qui — lato
 *  presentazione, senza toccare `data/starters.ts`. Il suffisso compare SOLO
 *  sulle etichette davvero ripetute: se un domani i dati vengono corretti,
 *  questa funzione smette da sola di aggiungerlo. */
const GENERE_AVATAR: Record<string, string> = { f: "donna", m: "uomo" };

function etichettaAvatar(a: AvatarPreset): string {
  if (AVATARS.filter((x) => x.label === a.label).length < 2) return a.label;
  const genere = GENERE_AVATAR[a.id.split("_").pop() ?? ""];
  return genere ? `${a.label} ${genere}` : a.label;
}

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  // Gli utenti ospite/test hanno displayName sintetici ("Ospite", "test"):
  // pre-riempire il campo con quelli lo faceva sembrare un bottone rotto e
  // nascondeva il placeholder. Si pre-riempie solo con un nome vero.
  const [name, setName] = useState(user && !user.isGuest ? user.displayName?.split(" ")[0] || "" : "");
  const [avatarId, setAvatarId] = useState(AVATARS[0].id);
  const [valleyId, setValleyId] = useState(VALLEYS[0].id);
  const [starterIdx, setStarterIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const compatto = useViewportBasso();

  const canNext = step === 0 ? name.trim().length >= 2 : true;
  const valley = VALLEYS.find((v) => v.id === valleyId)!;
  const nomeLungo = name.trim().length > NOME_ACCORCIATO_OLTRE;

  const finish = async () => {
    setError("");
    setSaving(true);
    try {
      const starter = STARTERS[starterIdx].cow;
      const starterInstance: Vatsamon = {
        ...starter,
        level: 1,
        capturedAt: new Date().toISOString().slice(0, 10),
      };
      const trainer: Trainer = {
        name: name.trim(),
        level: 1,
        xp: 0,
        xpToNextLevel: 100,
        capturedCount: 1,
        kmTraveled: 0,
        coins: 100 + valley.bonus.coins,
      };

      // Scrive le chiavi iniziali: App.tsx le legge al mount successivo.
      localStorage.setItem("vatsamon_collection_go", JSON.stringify([starterInstance]));
      localStorage.setItem("vatsamon_trainer_go", JSON.stringify(trainer));
      localStorage.setItem(
        "vatsamon_onboarded",
        JSON.stringify({ avatarId, valleyId, starterId: starter.id, at: Date.now() }),
      );
      // Il nuovo giocatore riceve Mémé di Nus al primo avvio (beat giocati).
      avviaTutorialAlProssimoAvvio();

      // Profilo pubblico/utente su Firestore (best-effort). Gli utenti ospite/test
      // hanno uid sintetici (non Firebase Auth reali): le regole Firestore li
      // rifiuterebbero con "Missing or insufficient permissions".
      if (firebaseEnabled && db && user && !user.isGuest) {
        await setDoc(
          doc(db, "users", user.uid),
          {
            trainerName: trainer.name,
            avatarId,
            valley: valleyId,
            starterBreed: starter.breed,
            starterId: starter.id,
            createdAt: serverTimestamp(),
          },
          { merge: true },
        );
        await saveCloudSave(user.uid);
      }

      onComplete();
    } catch (e) {
      console.error(e);
      setError("Non sono riuscito a salvare. Controlla la connessione e riprova.");
      setSaving(false);
    }
  };

  // Marchio + avanzamento. Su schermo alto stanno nella testata fissa, su
  // schermo basso scorrono insieme al contenuto: stesso markup, due posti.
  const testata = (
    <>
      {step === 0 && (
        // In compatto diventa una riga sola (emoji a sinistra, nome e riga di
        // spiegazione a destra): da 124px a ~48px. Non si toglie del tutto —
        // senza, l'app si apriva su un campo di testo senza dire cosa fosse.
        <div className={compatto ? "flex items-center justify-center gap-2.5 mb-3" : "text-center mb-5"}>
          <div className={`animate-float ${compatto ? "text-2xl" : "text-4xl mb-1"}`} aria-hidden="true">
            🐄
          </div>
          <div className={compatto ? "text-left" : ""}>
            <h1 className={`font-black title-gradient ${compatto ? "text-xl leading-tight" : "text-3xl"}`}>
              {BRAND.gameName.toUpperCase()}
            </h1>
            <p className={`text-slate-400 ${compatto ? "t-body" : "text-sm mt-1"}`}>
              Il gioco delle {BRAND.hubName} · {BRAND.hubTagline}
            </p>
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <div className={`h-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-slate-700"}`} />
            <p className={`t-meta mt-1 text-center ${i === step ? "text-primary-strong" : "text-slate-400"}`}>
              {label}
            </p>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div
      className="min-h-dvh w-full flex items-center justify-center px-4 text-slate-100"
      // Notch/Dynamic Island e barra gesti: il padding di base si somma alla
      // safe-area. Senza fasce (env = 0) la geometria è identica. In compatto
      // il margine verticale scende a 0,5rem: sono 16px di card in più, che in
      // orizzontale valgono una riga di contenuto.
      style={{
        paddingTop: `calc(${compatto ? "0.5rem" : "1rem"} + env(safe-area-inset-top))`,
        paddingBottom: `calc(${compatto ? "0.5rem" : "1rem"} + env(safe-area-inset-bottom))`,
      }}
    >
      <div className="aurora-bg" />
      <div
        className="w-full max-w-md bg-slate-900/90 backdrop-blur rounded-3xl border border-slate-700 shadow-xl flex flex-col overflow-hidden"
        style={{
          // Deve restare in pari col padding verticale del contenitore.
          maxHeight: `calc(100dvh - ${compatto ? "1rem" : "2rem"} - env(safe-area-inset-top) - env(safe-area-inset-bottom))`,
        }}
      >
        {/* Testata fissa: solo su schermo alto, dove lo spazio c'è. */}
        {!compatto && <div className="shrink-0 px-5 pt-6 pb-4">{testata}</div>}

        {/* Parte che scorre. Su schermo alto solo il contenuto del passo; su
            schermo basso anche marchio e avanzamento, così l'unico blocco che
            non cede resta la barra dei bottoni. */}
        <div className={`flex-1 min-h-0 overflow-y-auto no-scrollbar px-5 pb-2 ${compatto ? "pt-4" : ""}`}>
          {compatto && testata}

          {step === 0 && (
            <Section title="Come ti chiami, allenatore?" subtitle="Sarà il tuo nome in classifica.">
              <input
                type="text"
                maxLength={16}
                placeholder="Es. Lupo d'Alpe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="Nome dell'allenatore"
                // Bordo neutro sempre: il rosso lo mette il solo anello di focus
                // globale (*:focus-visible in index.css). Con anche il bordo in
                // rosso il campo sembrava un errore, non un campo attivo.
                className="w-full bg-slate-950 rounded-2xl px-4 py-3.5 text-lg font-bold border border-slate-700 text-slate-100 placeholder:text-slate-400 placeholder:font-normal"
              />
              {/* Avviso, non limite: il chip identità dell'intestazione taglia
                  oltre una decina di caratteri, ma il nome per esteso resta nel
                  salvataggio e nel Profilo. Il contenitore c'è sempre (vuoto è
                  alto 0) così `aria-live` annuncia la comparsa. */}
              <p aria-live="polite" className={`t-body text-slate-400 ${nomeLungo ? "mt-2" : ""}`}>
                {nomeLungo ? "Oltre i 10 caratteri il nome viene accorciato nell'intestazione di gioco." : ""}
              </p>
            </Section>
          )}

          {step === 1 && (
            <Section title="Scegli il tuo avatar">
              <div className="grid grid-cols-3 gap-3">
                {AVATARS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAvatarId(a.id)}
                    aria-pressed={avatarId === a.id}
                    className={`rounded-2xl py-4 border-2 flex flex-col items-center gap-1 ${
                      avatarId === a.id ? "chip-active-soft" : "border-slate-700 bg-slate-950"
                    }`}
                  >
                    <span className="text-4xl" aria-hidden="true">{a.emoji}</span>
                    <span className="text-xs text-slate-300 text-center">{etichettaAvatar(a)}</span>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {step === 2 && (
            <Section
              title="Da quale valle vieni?"
              subtitle={`Per partire ti dà un piccolo bonus di ${VALUTE.denari.nome}.`}
            >
              <div className="space-y-1.5">
                {VALLEYS.map((v) => {
                  const scelta = valleyId === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setValleyId(v.id)}
                      aria-pressed={scelta}
                      className={`w-full text-left rounded-2xl px-2.5 py-2 min-h-11 border-2 ${
                        scelta ? "chip-active-soft" : "border-slate-700 bg-slate-950"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-2xl leading-none">{v.emoji}</span>
                        {/* Due righe invece di una troncata: col numero da solo
                            il nome stava sempre su una riga, con "🪙 +250
                            Denari" accanto la colonna perde ~60px e a 393px si
                            leggeva "Valle del Lys (Monte…". Il nome della valle
                            è la cosa che si sceglie: meglio 7px di riga in più
                            su cinque voci che un nome tagliato. */}
                        <span className="h-card flex-1 min-w-0 line-clamp-2 text-slate-100">{v.name}</span>
                        {/* Numero SEMPRE con glifo e unità: "+250" da solo non
                            dice di cosa. Il nome è quello che la valuta ha nel
                            resto del gioco (chip 🪙 dell'HUD, Profilo,
                            `VALUTE.denari`) — le etichette "Scude d'avvio" di
                            `data/starters.ts` non compaiono da nessun'altra
                            parte, quindi qui non si usano. */}
                        <span className="t-meta tone-reward shrink-0">
                          {VALUTE.denari.emoji} +{v.bonus.coins} Denari
                        </span>
                      </span>
                      {/* La lore si apre solo sulla valle scelta: dodici paragrafi
                          aperti insieme rendevano il passo lungo il doppio dello
                          schermo e spingevano "Avanti" fuori dalla piega. */}
                      {scelta && <span className="t-body block mt-1.5 text-slate-300">{v.blurb}</span>}
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          {step === 3 && (
            <Section title="Scegli la tua prima Reina" subtitle="Ti accompagnerà nei primi alpeggi.">
              <div className="space-y-2">
                {STARTERS.map((s, i) => (
                  <button
                    key={s.cow.id}
                    onClick={() => setStarterIdx(i)}
                    aria-pressed={starterIdx === i}
                    // min-h uniforme: senza, la card col nome più lungo cresceva
                    // di 24px e la lista sembrava storta.
                    className={`w-full text-left rounded-2xl p-2.5 min-h-26 border-2 flex items-center gap-2.5 ${
                      starterIdx === i ? "chip-active-soft" : "border-slate-700 bg-slate-950"
                    }`}
                  >
                    {/* Box con lo stesso rapporto delle foto invece che quadrato:
                        le foto delle Reines sono orizzontali (misurate: 927×527 e
                        849×527, cioè 1,61–1,76), quindi in un riquadro quadrato
                        restavano bande vuote alte 14px sopra e sotto. Con 5/3 la
                        figura riempie il box e resta intera: `object-cover` in un
                        box quadrato taglierebbe la testa (le Reines sono di
                        profilo, alcune a destra e altre a sinistra — vedi il
                        contratto in CowVisual.tsx). */}
                    <CowVisual cow={s.cow} className="w-16 aspect-[5/3] shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="h-card block truncate text-slate-100">
                        {s.choice.emoji} {s.choice.vibe}
                        <span className="text-slate-400 font-normal"> · {s.cow.name}</span>
                      </span>
                      <span className="t-body block line-clamp-2 text-slate-400">{s.choice.tagline}</span>
                      <span className="t-meta block mt-1 text-slate-300">
                        {s.cow.breed} · {s.cow.rarity} · CP {s.cow.cp}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {error && (
            <p role="alert" className="text-sm text-primary-strong font-medium mt-3">
              {error}
            </p>
          )}
        </div>

        {/* Nav — fissa in fondo alla card, mai sotto la barra gesti. In verticale
            CTA a tutta larghezza e Indietro sotto: affiancati, "Inizia
            l'avventura" andava a capo su ogni iPhone sotto i 400px di larghezza.
            In compatto si affiancano lo stesso (`flex-row-reverse`: la CTA resta
            prima nel DOM, quindi prima nell'ordine di tabulazione, e finisce a
            destra): lì la card è larga 448px e il testo ci sta, mentre impilati
            i bottoni costavano 136px di card su 268 disponibili. */}
        <div
          className={`shrink-0 px-5 border-t border-slate-800 ${
            compatto ? "pt-2 pb-3 flex flex-row-reverse items-center gap-2" : "pt-3 pb-6 space-y-2"
          }`}
        >
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => canNext && setStep((s) => s + 1)}
              disabled={!canNext}
              className={`btn-primary is-disabled flex items-center justify-center gap-1 font-bold rounded-2xl border px-5 min-h-12 ${
                compatto ? "flex-1 min-w-0" : "w-full"
              }`}
            >
              Avanti <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={saving}
              className={`btn-primary is-disabled flex items-center justify-center gap-2 font-bold rounded-2xl border px-5 min-h-12 ${
                compatto ? "flex-1 min-w-0" : "w-full"
              }`}
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
              Inizia l'avventura
            </button>
          )}

          {step > 0 && (
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={saving}
              className={`is-disabled flex items-center justify-center gap-1 rounded-xl min-h-11 text-sm text-slate-400 font-semibold ${
                compatto ? "shrink-0 px-4" : "w-full"
              }`}
            >
              <ChevronLeft size={18} /> Indietro
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="view-in">
      <h2 className="h-section text-slate-100">{title}</h2>
      {subtitle && <p className="t-body text-slate-400 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}
