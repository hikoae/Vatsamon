import { Vatsamon } from "../types";
import { VatsamonAvatar } from "./VatsamonAvatar";
import { resolveIllustration } from "../data/illustrations";
import { usePhotoUrl } from "../lib/photoStore";

/**
 * Sceglie la grafica della bovina secondo la priorità:
 * 1) foto reale → 2) foto d'avvistamento del giocatore (IndexedDB locale) →
 * 3) illustrazione (per nome, poi per razza) → 4) avatar procedurale.
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

  if (sightingUrl && !cow.realPhoto) {
    return (
      <div
        className={`overflow-hidden rounded-2xl flex items-center justify-center ${className} ${isAttacking ? "animate-bounce" : ""}`}
        style={{ background: "linear-gradient(180deg,#eef1f6 0%,#e3e8f0 55%,#d6dce7 100%)" }}
      >
        <img src={sightingUrl} alt={cow.name} loading="lazy" className="w-full h-full object-contain" />
      </div>
    );
  }

  if (cow.realPhoto) {
    // Foto intera, centrata, su sfondo neutro (studio): la Reina è sempre tutta
    // visibile (niente teste/posteriori tagliati dal ritaglio quadrato).
    return (
      <div
        className={`overflow-hidden rounded-2xl flex items-center justify-center ${className} ${isAttacking ? "animate-bounce" : ""}`}
        style={{ background: "linear-gradient(180deg,#eef1f6 0%,#e3e8f0 55%,#d6dce7 100%)" }}
      >
        <img
          src={cow.realPhoto}
          alt={cow.name}
          loading="lazy"
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  const illustration = resolveIllustration(cow.name, cow.breed);
  if (illustration) {
    return (
      <img
        src={illustration}
        alt={cow.name}
        loading="lazy"
        className={`object-contain rounded-2xl ${className} ${isAttacking ? "animate-bounce" : ""}`}
      />
    );
  }

  return <VatsamonAvatar breed={cow.breed} rarity={cow.rarity} className={className} isAttacking={isAttacking} />;
}
