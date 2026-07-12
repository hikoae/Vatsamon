/**
 * Creazione del personaggio al primo accesso (un solo flusso, 4 passi):
 *  1) Nome allenatore  2) Avatar  3) Valle d'origine  4) Reina starter.
 *
 * Al termine scrive le chiavi localStorage iniziali (lette poi dal monolite
 * App.tsx), salva il profilo su Firestore e fa il primo salvataggio cloud.
 */
import { useState } from "react";
import { ChevronRight, ChevronLeft, Check, Loader2 } from "lucide-react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, firebaseEnabled } from "../lib/firebase";
import { saveCloudSave } from "../lib/cloudSave";
import { useAuth } from "../lib/auth";
import { AVATARS, VALLEYS, STARTERS } from "../data/starters";
import { CowVisual } from "./CowVisual";
import { avviaTutorialAlProssimoAvvio } from "../lib/tutorial";
import { Vatsamon, Trainer } from "../types";

const STEPS = ["Nome", "Avatar", "Valle", "Starter"] as const;

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.displayName?.split(" ")[0] || "");
  const [avatarId, setAvatarId] = useState(AVATARS[0].id);
  const [valleyId, setValleyId] = useState(VALLEYS[0].id);
  const [starterIdx, setStarterIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canNext = step === 0 ? name.trim().length >= 2 : true;
  const valley = VALLEYS.find((v) => v.id === valleyId)!;

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

  return (
    <div className="min-h-dvh w-full flex items-center justify-center p-4 text-slate-100">
      <div className="aurora-bg" />
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur rounded-3xl border border-slate-700 shadow-xl p-6">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-5">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div
                className={`h-1.5 rounded-full ${i <= step ? "bg-rose-500" : "bg-slate-700"}`}
              />
              <p className={`text-[10px] mt-1 text-center ${i === step ? "text-rose-500 font-bold" : "text-slate-400"}`}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {step === 0 && (
          <Section title="Come ti chiami, allenatore?" subtitle="Sarà il tuo nome in classifica.">
            <input
              autoFocus
              type="text"
              maxLength={16}
              placeholder="Es. Lupo d'Alpe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 rounded-2xl px-4 py-4 text-lg text-center font-bold border border-slate-700 outline-none focus:border-rose-500 text-slate-100 placeholder:text-slate-400"
            />
          </Section>
        )}

        {step === 1 && (
          <Section title="Scegli il tuo avatar">
            <div className="grid grid-cols-3 gap-3">
              {AVATARS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAvatarId(a.id)}
                  className={`rounded-2xl py-4 border-2 flex flex-col items-center gap-1 ${
                    avatarId === a.id ? "border-rose-500 bg-rose-950" : "border-slate-700 bg-slate-950"
                  }`}
                >
                  <span className="text-4xl">{a.emoji}</span>
                  <span className="text-xs text-slate-300">{a.label}</span>
                </button>
              ))}
            </div>
          </Section>
        )}

        {step === 2 && (
          <Section title="Da quale valle vieni?" subtitle="Ti dà un piccolo bonus di partenza.">
            <div className="space-y-2">
              {VALLEYS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setValleyId(v.id)}
                  className={`w-full text-left rounded-2xl p-3 border-2 flex items-start gap-3 ${
                    valleyId === v.id ? "border-rose-500 bg-rose-950" : "border-slate-700 bg-slate-950"
                  }`}
                >
                  <span className="text-3xl">{v.emoji}</span>
                  <div className="flex-1">
                    <p className="font-bold text-slate-100">{v.name}</p>
                    <p className="text-xs text-slate-400">{v.blurb}</p>
                    <p className="text-xs text-emerald-600 font-semibold mt-1">🪙 {v.bonus.label}</p>
                  </div>
                </button>
              ))}
            </div>
          </Section>
        )}

        {step === 3 && (
          <Section title="Scegli la tua prima Reina" subtitle="Ti accompagnerà nei primi alpeggi.">
            <div className="space-y-3">
              {STARTERS.map((s, i) => (
                <button
                  key={s.cow.id}
                  onClick={() => setStarterIdx(i)}
                  className={`w-full text-left rounded-2xl p-3 border-2 flex items-center gap-3 ${
                    starterIdx === i ? "border-rose-500 bg-rose-950" : "border-slate-700 bg-slate-950"
                  }`}
                >
                  <CowVisual cow={s.cow} className="w-16 h-16 shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-slate-100">
                      {s.choice.emoji} {s.choice.vibe}{" "}
                      <span className="text-slate-400 font-normal">· {s.cow.name}</span>
                    </p>
                    <p className="text-xs text-slate-400">{s.choice.tagline}</p>
                    <p className="text-[11px] text-slate-300 mt-1">
                      {s.cow.breed} · {s.cow.rarity} · CP {s.cow.cp}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </Section>
        )}

        {error && <p className="text-sm text-rose-500 font-medium mt-3">{error}</p>}

        {/* Nav */}
        <div className="flex items-center justify-between mt-6 gap-3">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || saving}
            className="flex items-center gap-1 text-slate-400 disabled:opacity-30 font-semibold"
          >
            <ChevronLeft size={18} /> Indietro
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => canNext && setStep((s) => s + 1)}
              disabled={!canNext}
              className="flex items-center gap-1 nav-active text-white font-bold rounded-2xl px-5 py-2.5 disabled:opacity-40"
            >
              Avanti <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={saving}
              className="flex items-center gap-2 nav-active text-white font-bold rounded-2xl px-5 py-2.5 disabled:opacity-60"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
              Inizia l'avventura
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
      <h2 className="text-xl font-black text-slate-100">{title}</h2>
      {subtitle && <p className="text-sm text-slate-400 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}
