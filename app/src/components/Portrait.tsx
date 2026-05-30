import { useState } from "react";
import type { Vazzamon } from "../data/types";
import { fotoUrl, SILHOUETTE_URL } from "../data/db";
import { VazzamonAvatar } from "./VazzamonAvatar";

/**
 * Ritratto unificato:
 * - bovina reale con foto → foto vera
 * - generata/schiusa → avatar procedurale (o immagine scansionata)
 * - reale senza foto → silhouette
 */
export function Portrait({
  cow,
  className = "",
  rounded = "rounded-2xl",
  forceSilhouette = false,
}: {
  cow: Vazzamon;
  className?: string;
  rounded?: string;
  forceSilhouette?: boolean;
}) {
  const real = fotoUrl(cow);
  const [broken, setBroken] = useState(false);

  if (!forceSilhouette && cow.imageUrl) {
    return (
      <img
        src={cow.imageUrl}
        alt={cow.nome}
        className={`object-cover ${rounded} ${className}`}
      />
    );
  }
  if (!forceSilhouette && real && !broken) {
    return (
      <img
        src={real}
        alt={cow.nome}
        loading="lazy"
        onError={() => setBroken(true)}
        className={`object-cover bg-alpino-100 ${rounded} ${className}`}
      />
    );
  }
  if (!forceSilhouette && (cow.origine === "generata" || cow.origine === "schiusa")) {
    return (
      <div className={`flex items-center justify-center bg-alpino-50 ${rounded} ${className}`}>
        <VazzamonAvatar breed={cow.razza} rarity={cow.rarita} className="w-3/4 h-3/4" />
      </div>
    );
  }
  return (
    <img
      src={SILHOUETTE_URL}
      alt={cow.nome}
      className={`object-cover bg-alpino-100 ${rounded} ${className}`}
    />
  );
}
