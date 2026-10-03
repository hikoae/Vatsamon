import { useEffect, useMemo, useState } from "react";
import { Vatsamon } from "../types";
import { VatsamonAvatar } from "./VatsamonAvatar";
import { resolveIllustration } from "../data/illustrations";
import { usePhotoUrl } from "../lib/photoStore";

/**
 * Sceglie la grafica della bovina secondo la priorità:
 * 1) foto reale → 2) foto d'avvistamento del giocatore (IndexedDB locale) →
 * 3) illustrazione (per nome, poi per razza) → 4) avatar procedurale.
 * Se la sorgente attiva fallisce il caricamento (rete instabile in montagna,
 * file mancante/rinominato, ecc.) si passa alla successiva della catena via
 * onError. L'avatar procedurale è l'ultimo anello: è un SVG inline che non
 * dipende dalla rete, quindi non fallisce mai.
 *
 * ===== FORMA DEL BOX — contratto per chi usa il componente =====
 * Tutte le grafiche sorgente sono ORIZZONTALI: le foto delle Reines sono
 * 849-927 × 527 (≈16:9) e le illustrazioni 640 × 349 (≈16:9). Dentro un box
 * QUADRATO `object-contain` le rimpicciolisce fino a farle stare in altezza e
 * lascia vuoto il 43-44% del riquadro, sopra e sotto (in un box 62×62 la foto
 * rende 62×35). A colpo d'occhio non si legge come "foto centrata": si legge
 * come immagine rotta.
 *
 * Perciò, dove puoi: dai al box lo stesso rapporto della sorgente
 * (`aspect-[16/9]`, come `w-full aspect-[16/9]`) e passa `fit="cover"`. Il
 * ritaglio risulta quasi nullo (0-9% in altezza: mangia solo la cornice beige
 * stampata dentro le foto) e la Reina rende molto più grande.
 *
 * NON usare `fit="cover"` con un box quadrato: terrebbe solo il ~57% centrale
 * della larghezza e taglierebbe la testa. Le Reines sono riprese di profilo,
 * alcune rivolte a sinistra e altre a destra (verificato sulle foto), quindi
 * non esiste un `object-position` che le salvi tutte. Box quadrato ⇒ resta
 * `fit="contain"`, che è il default e lascia il comportamento di sempre.
 */
export function CowVisual({
  cow,
  className = "w-32 h-32",
  isAttacking = false,
  fit = "contain",
}: {
  cow: Pick<Vatsamon, "breed" | "rarity" | "realPhoto" | "name"> & { sightingPhotoId?: string };
  className?: string;
  isAttacking?: boolean;
  /** Come la figura riempie il box. Vedi "FORMA DEL BOX" qui sopra. */
  fit?: "contain" | "cover";
}) {
  // la foto scattata dal giocatore vive solo su questo dispositivo
  const sightingUrl = usePhotoUrl(cow.sightingPhotoId);
  const illustration = resolveIllustration(cow.name, cow.breed);

  const candidates = useMemo(
    () => [cow.realPhoto, sightingUrl, illustration].filter((src): src is string => Boolean(src)),
    [cow.realPhoto, sightingUrl, illustration]
  );
  const candidatesKey = candidates.join("|");

  const [failedSrcs, setFailedSrcs] = useState<Set<string>>(() => new Set());

  // nuova bovina o nuove sorgenti disponibili → si riparte da capo con i suoi tentativi
  useEffect(() => {
    setFailedSrcs(new Set());
  }, [candidatesKey]);

  const activeSrc = candidates.find((src) => !failedSrcs.has(src));
  const objectFit = fit === "cover" ? "object-cover" : "object-contain";

  const handleImageError = () => {
    if (!activeSrc) return;
    setFailedSrcs((prev) => (prev.has(activeSrc) ? prev : new Set(prev).add(activeSrc)));
  };

  if (activeSrc && activeSrc === illustration) {
    return (
      <img
        src={illustration}
        alt={cow.name}
        loading="lazy"
        className={`${objectFit} rounded-2xl ${className} ${isAttacking ? "animate-bounce" : ""}`}
        onError={handleImageError}
      />
    );
  }

  if (activeSrc) {
    // Con `contain` (box quadrato): foto intera, centrata, su sfondo neutro
    // (studio) — niente teste/posteriori tagliati dal ritaglio quadrato.
    // Con `cover` (box 16:9): la foto riempie il riquadro e il fondo resta
    // visibile solo durante il caricamento.
    return (
      <div
        className={`overflow-hidden rounded-2xl flex items-center justify-center ${className} ${isAttacking ? "animate-bounce" : ""}`}
        style={{ background: "linear-gradient(180deg,#eef1f6 0%,#e3e8f0 55%,#d6dce7 100%)" }}
      >
        <img
          src={activeSrc}
          alt={cow.name}
          loading="lazy"
          className={`w-full h-full ${objectFit}`}
          onError={handleImageError}
        />
      </div>
    );
  }

  return <VatsamonAvatar breed={cow.breed} rarity={cow.rarity} className={className} isAttacking={isAttacking} />;
}
