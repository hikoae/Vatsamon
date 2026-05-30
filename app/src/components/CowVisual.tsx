import { Vazzamon } from "../types";
import { VazzamonAvatar } from "./VazzamonAvatar";

/**
 * Mostra la foto REALE se la bovina ne ha una, altrimenti l'avatar procedurale.
 */
export function CowVisual({
  cow,
  className = "w-32 h-32",
  isAttacking = false,
}: {
  cow: Pick<Vazzamon, "breed" | "rarity" | "realPhoto" | "name">;
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
  return <VazzamonAvatar breed={cow.breed} rarity={cow.rarity} className={className} isAttacking={isAttacking} />;
}
