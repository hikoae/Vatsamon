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
 */
export function CowVisual({
  cow,
  className = "w-32 h-32",
  isAttacking = false,
}: {
  cow: Pick<Vatsamon, "breed" | "rarity" | "realPhoto" | "name"> & { sightingPhotoId?: string };
  className?: string;
  isAttacking?: boolean;
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
        className={`object-contain rounded-2xl ${className} ${isAttacking ? "animate-bounce" : ""}`}
        onError={handleImageError}
      />
    );
  }

  if (activeSrc) {
    // Foto intera, centrata, su sfondo neutro (studio): la Reina è sempre tutta
    // visibile (niente teste/posteriori tagliati dal ritaglio quadrato).
    return (
      <div
        className={`overflow-hidden rounded-2xl flex items-center justify-center ${className} ${isAttacking ? "animate-bounce" : ""}`}
        style={{ background: "linear-gradient(180deg,#eef1f6 0%,#e3e8f0 55%,#d6dce7 100%)" }}
      >
        <img
          src={activeSrc}
          alt={cow.name}
          loading="lazy"
          className="w-full h-full object-contain"
          onError={handleImageError}
        />
      </div>
    );
  }

  return <VatsamonAvatar breed={cow.breed} rarity={cow.rarity} className={className} isAttacking={isAttacking} />;
}
