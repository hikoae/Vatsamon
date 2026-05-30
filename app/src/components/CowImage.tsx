import { useState } from "react";
import type { Bovina } from "../data/types";
import { fotoUrl, SILHOUETTE_URL } from "../data/db";

interface Props {
  bovina: Bovina;
  className?: string;
  /** Se true mostra sempre la silhouette (es. incontro non ancora catturato). */
  forceSilhouette?: boolean;
  alt?: string;
}

/** Mostra la foto reale se presente, altrimenti la silhouette. */
export function CowImage({ bovina, className, forceSilhouette, alt }: Props) {
  const real = fotoUrl(bovina);
  const initial = !forceSilhouette && real ? real : SILHOUETTE_URL;
  const [src, setSrc] = useState(initial);

  return (
    <img
      className={className}
      src={src}
      alt={alt ?? bovina.nome}
      loading="lazy"
      onError={() => setSrc(SILHOUETTE_URL)}
    />
  );
}
