import { Vatsamon } from "../types";
import { VatsamonAvatar } from "./VatsamonAvatar";
import { resolveIllustration } from "../data/illustrations";

/**
 * Sceglie la grafica della bovina secondo la priorità:
 * 1) foto reale → 2) illustrazione (per nome, poi per razza) → 3) avatar procedurale.
 */
export function CowVisual({
  cow,
  className = "w-32 h-32",
  isAttacking = false,
}: {
  cow: Pick<Vatsamon, "breed" | "rarity" | "realPhoto" | "name">;
  className?: string;
  isAttacking?: boolean;
}) {
  if (cow.realPhoto) {
    return (
      <img
        src={cow.realPhoto}
        alt={cow.name}
        loading="lazy"
        className={`object-cover rounded-2xl ${className} ${isAttacking ? "animate-bounce" : ""}`}
      />
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
