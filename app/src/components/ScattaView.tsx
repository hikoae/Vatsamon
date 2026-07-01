import { useRef, useState } from 'react';
import { Camera, RefreshCw, X } from 'lucide-react';
import { detectBovina, nomeAnimale, DetectResult } from '../lib/detector';

/**
 * SCATTA LA REINA — lo scanner fotografico vero (ispirato a CatchCat, ma con
 * le Reines): fotografi una bovina reale, il riconoscitore on-device verifica
 * che sia davvero una bovina, e la TUA foto diventa la carta d'avvistamento.
 * La foto resta sul dispositivo (IndexedDB), niente cloud, niente volti.
 */

type Fase = 'idle' | 'camera' | 'checking' | 'confirmed' | 'rejected' | 'errore';

export function ScattaView({ onSighting, playClick }: {
  /** dataUrl = foto verificata e ritagliata; null = avvistamento senza foto. */
  onSighting: (photoDataUrl: string | null) => void;
  playClick: () => void;
}) {
  const [fase, setFase] = useState<Fase>('idle');
  const [checkMsg, setCheckMsg] = useState('');
  const [result, setResult] = useState<DetectResult | null>(null);
  const [cardPhoto, setCardPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ---- fotocamera ----
  const startCamera = async () => {
    playClick();
    try {
      setFase('camera');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch {
      // niente camera (permesso negato / desktop): torna all'upload
      setFase('idle');
    }
  };

  const stopCamera = () => {
    const v = videoRef.current;
    if (v?.srcObject) {
      (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      v.srcObject = null;
    }
  };

  const snapFromCamera = () => {
    playClick();
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext('2d')!.drawImage(v, 0, 0);
    stopCamera();
    void analyze(canvas.toDataURL('image/jpeg', 0.92));
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => void analyze(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = ''; // permetti di ricaricare lo stesso file
  };

  // ---- verifica on-device ----
  async function analyze(dataUrl: string) {
    setFase('checking');
    setCheckMsg('Il Pastore apre gli occhi… (la prima volta scarica il riconoscitore, ~18MB)');
    try {
      const img = new Image();
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('img')); img.src = dataUrl; });
      setCheckMsg('Osservo la mandria con calma…');
      const det = await detectBovina(img);
      setResult(det);
      if (det.isBovina) {
        setCardPhoto(cropForCard(img, det.bbox));
        setFase('confirmed');
      } else {
        setFase('rejected');
      }
    } catch {
      setFase('errore');
    }
  }

  /** Ritaglia la bovina (bbox + margine) e riduce a carta ~640px, JPEG. */
  function cropForCard(img: HTMLImageElement, bbox: [number, number, number, number] | null): string {
    const [bx, by, bw, bh] = bbox ?? [0, 0, img.naturalWidth, img.naturalHeight];
    const pad = 0.15;
    const x = Math.max(0, bx - bw * pad);
    const y = Math.max(0, by - bh * pad);
    const w = Math.min(img.naturalWidth - x, bw * (1 + pad * 2));
    const h = Math.min(img.naturalHeight - y, bh * (1 + pad * 2));
    const scale = Math.min(1, 640 / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.getContext('2d')!.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  }

  const reset = () => { setFase('idle'); setResult(null); setCardPhoto(null); };

  return (
    <div className="space-y-6" id="scanner-view">
      <div className="bg-slate-950 rounded-3xl p-5 border border-slate-850 shadow-md">
        <h2 className="text-xl font-black text-emerald-400 flex items-center gap-1.5 uppercase">
          <Camera className="w-5 h-5" />
          Scatta la Reina
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Incontri una bovina vera sui pascoli? Fotografala: il riconoscitore verifica
          <b className="text-slate-300"> sul tuo telefono</b> che sia davvero lei, e la tua foto
          diventa la carta d'avvistamento. La foto non lascia mai il dispositivo.
        </p>

        {fase === 'idle' && (
          <div className="mt-5 border-2 border-dashed border-slate-800 bg-slate-900/40 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="space-y-4 max-w-sm">
              <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-2xl mx-auto shadow-inner" aria-hidden="true">
                📷
              </div>
              <div>
                <p className="font-extrabold text-slate-200 text-sm">Scatta o carica la foto di una bovina</p>
                <p className="text-[10px] text-slate-500 mt-0.5">JPEG, PNG. Verifica on-device: la foto resta sul telefono.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  onClick={startCamera}
                  className="w-full sm:w-auto bg-[#10b981] hover:bg-emerald-400 text-[#0b0820] font-bold text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer min-h-[44px]"
                >
                  Usa la fotocamera
                </button>
                <button
                  onClick={() => { playClick(); fileInputRef.current?.click(); }}
                  className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer min-h-[44px]"
                >
                  Carica una foto
                </button>
              </div>

              <input type="file" ref={fileInputRef} onChange={onFile} className="hidden" accept="image/*" />

              <div className="py-2 flex items-center text-slate-700 text-[10px] uppercase tracking-widest justify-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="mx-3">oppure</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <button
                onClick={() => { playClick(); onSighting(null); }}
                className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-850 py-2.5 rounded-xl text-yellow-400 text-xs font-bold transition-all cursor-pointer shadow active:scale-95 min-h-[44px]"
              >
                🐮 Registra un avvistamento senza foto
              </button>
            </div>
          </div>
        )}

        {fase === 'camera' && (
          <div className="mt-5 w-full max-w-sm mx-auto space-y-4">
            <div className="relative aspect-square rounded-2xl overflow-hidden shadow-md border border-emerald-500/20 bg-black">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <div className="absolute inset-5 border border-dashed border-yellow-400/40 rounded-xl flex items-center justify-center pointer-events-none">
                <span className="text-[10px] text-yellow-400 animate-pulse">INQUADRA LA BOVINA</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={snapFromCamera}
                className="flex-grow bg-emerald-500 hover:bg-emerald-400 text-[#0b0820] font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow border-b-2 border-emerald-700 min-h-[44px]"
              >
                📸 Scatta
              </button>
              <button
                onClick={() => { playClick(); stopCamera(); reset(); }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-400 py-2.5 px-4 rounded-xl text-xs min-h-[44px]"
              >
                Annulla
              </button>
            </div>
          </div>
        )}

        {fase === 'checking' && (
          <div className="py-8 space-y-4 max-w-sm mx-auto text-center" id="scan-bar-loader">
            <div className="w-14 h-14 mx-auto rounded-full border-4 border-slate-800 border-t-emerald-500 animate-spin flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-black text-emerald-400 text-sm">Verifica in corso…</h4>
              <p className="text-[10px] text-slate-400 mt-1 italic">{checkMsg}</p>
            </div>
          </div>
        )}

        {fase === 'confirmed' && result && (
          <div className="mt-5 max-w-sm mx-auto space-y-3 text-center" id="sighting-result">
            <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/50 shadow-lg bg-black">
              {cardPhoto && <img src={cardPhoto} alt="La bovina che hai fotografato" className="w-full max-h-72 object-contain" />}
              <div className="absolute top-2 left-2 bg-emerald-500 text-[#0b0820] text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                Bovina verificata · {Math.round(result.score * 100)}%
              </div>
            </div>
            <p className="text-xs text-slate-300">
              È proprio una bovina! Avvicìnati con calma e prova a fartela affidare:
              la <b className="text-emerald-300">tua foto</b> diventerà la carta dell'avvistamento.
            </p>
            <div className="flex gap-2">
              <button
                id="sighting-confirm"
                onClick={() => { playClick(); onSighting(cardPhoto); }}
                className="flex-grow bg-emerald-500 hover:bg-emerald-400 text-[#0b0820] font-black text-xs py-3 rounded-xl border-b-4 border-emerald-700 min-h-[48px]"
              >
                🔔 Avvicìnati col campanaccio
              </button>
              <button
                onClick={() => { playClick(); reset(); }}
                aria-label="Scarta la foto e ricomincia"
                className="bg-slate-800 hover:bg-slate-700 text-slate-400 py-2.5 px-4 rounded-xl text-xs min-h-[48px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {fase === 'rejected' && result && (
          <div className="mt-5 max-w-sm mx-auto space-y-3 text-center" id="sighting-rejected">
            <div className="text-4xl" aria-hidden="true">🤔</div>
            <p className="text-sm font-bold text-slate-200">
              Qui vedo {nomeAnimale(result.animale)}…
            </p>
            <p className="text-xs text-slate-400">
              {result.animale === 'dog' ? 'È un bel cane, ma la Bataille è un\'altra cosa!' :
               result.animale === 'cat' ? 'Il gatto va bene per CatchCat: qui alleviamo Reines!' :
               'Per il Libretto di Mandria serve una bovina in carne e ossa. Riprova!'}
            </p>
            <button
              onClick={() => { playClick(); reset(); }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 rounded-xl min-h-[44px]"
            >
              Riprova con un'altra foto
            </button>
          </div>
        )}

        {fase === 'errore' && (
          <div className="mt-5 max-w-sm mx-auto space-y-3 text-center">
            <div className="text-4xl" aria-hidden="true">📡</div>
            <p className="text-sm font-bold text-slate-200">Il riconoscitore non è disponibile.</p>
            <p className="text-xs text-slate-400">
              La prima verifica richiede di scaricare il riconoscitore (~18MB): controlla la
              connessione e riprova. Dopo il primo scaricamento funziona anche offline.
            </p>
            <button
              onClick={() => { playClick(); reset(); }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 rounded-xl min-h-[44px]"
            >
              Riprova
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
