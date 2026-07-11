/**
 * SCATTA LA REINA — verifica on-device che nella foto ci sia davvero una
 * bovina (modello COCO-SSD lite, ~18MB, servito da /models/ssdlite in questo
 * stesso sito: funziona offline dopo il primo caricamento, nessun dato esce
 * dal dispositivo). TensorFlow.js è caricato in lazy (code-splitting): il
 * bundle iniziale dell'app non lo paga.
 */

export interface DetectResult {
  /** true se il modello ha visto una bovina con confidenza sufficiente. */
  isBovina: boolean;
  /** classe COCO più probabile tra gli animali visti (o null se nulla). */
  animale: string | null;
  /** confidenza 0..1 della classe riportata. */
  score: number;
  /** bounding box [x, y, larghezza, altezza] in pixel dell'animale. */
  bbox: [number, number, number, number] | null;
}

/** Classi COCO animali che generano messaggi simpatici quando NON è una bovina. */
export const ANIMALI_COCO = ["cow", "horse", "sheep", "dog", "cat", "bird", "bear", "elephant", "zebra", "giraffe"];

const SOGLIA_BOVINA = 0.45;

type CocoModel = { detect: (img: HTMLImageElement | HTMLCanvasElement) => Promise<Array<{ class: string; score: number; bbox: [number, number, number, number] }>> };

let modelPromise: Promise<CocoModel> | null = null;

/** Carica (una sola volta) il modello di riconoscimento. */
export function loadDetector(): Promise<CocoModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      // import dinamici → chunk separati, scaricati solo alla prima scansione
      const tf = await import("@tensorflow/tfjs");
      await tf.ready();
      const cocoSsd = await import("@tensorflow-models/coco-ssd");
      // Modello servito dal nostro stesso sito (vendorizzato): offline-friendly
      // e nessuna dipendenza da CDN esterni.
      const modelUrl = `${import.meta.env.BASE_URL}models/ssdlite/model.json`;
      return cocoSsd.load({ base: "lite_mobilenet_v2", modelUrl });
    })().catch((e) => {
      modelPromise = null; // permetti un retry al prossimo tentativo
      throw e;
    });
  }
  return modelPromise;
}

/** Analizza un'immagine e dice se contiene una bovina (e cosa ha visto). */
export async function detectBovina(img: HTMLImageElement | HTMLCanvasElement): Promise<DetectResult> {
  const model = await loadDetector();
  const predictions = await model.detect(img);
  // la bovina più confidente, se c'è
  const cow = predictions
    .filter((p) => p.class === "cow" && p.score >= SOGLIA_BOVINA)
    .sort((a, b) => b.score - a.score)[0];
  if (cow) return { isBovina: true, animale: "cow", score: cow.score, bbox: cow.bbox };
  // altrimenti l'animale (o oggetto) più confidente per il messaggio di cortesia
  const best = predictions.sort((a, b) => b.score - a.score)[0];
  return {
    isBovina: false,
    animale: best?.class ?? null,
    score: best?.score ?? 0,
    bbox: best?.bbox ?? null,
  };
}

/** Nome italiano simpatico per la classe COCO vista al posto della bovina. */
export function nomeAnimale(cocoClass: string | null): string {
  const nomi: Record<string, string> = {
    horse: "un cavallo", sheep: "una pecora", dog: "un cane", cat: "un gatto",
    bird: "un uccello", bear: "un orso (!)", elephant: "un elefante (?!)",
    zebra: "una zebra (?!)", giraffe: "una giraffa (?!)", person: "una persona",
  };
  return cocoClass ? (nomi[cocoClass] ?? "qualcosa che non è una Reina") : "nulla di riconoscibile";
}
