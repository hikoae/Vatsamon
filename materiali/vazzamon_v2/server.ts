import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Support parsing large base64 image payloads in json body
app.use(express.json({ limit: "15mb" }));

// Initialize Google GenAI if key is present
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini API initialized successfully with server secret key.");
  } catch (error) {
    console.error("Failed to initialize Gemini Client:", error);
  }
} else {
  console.log("No GEMINI_API_KEY found in process.env. Simulation mode enabled.");
}

// Cultural lists of Valle d'Aosta Vazzamon parameters for fallback simulation
const AUTUMN_BREEDS = [
  { breed: "Castana Valdostana", weight: "Reina delle Vette" },
  { breed: "Pezzata Rossa", weight: "Regina del Latte" },
  { breed: "Pezzata Nera", weight: "Dama dei Ghiacciai" },
  { breed: "Evolène", weight: "Guardiana dei Valichi" }
];

const FUN_COW_NAMES = [
  "Mont-Blanc Colossus", "Reina di Valsavarenche", "Fontina Champion", "Pianeta Alpeggio",
  "Corno d'Acciaio", "Grolla Warrior", "Castor ed Pollux", "Mocetta Ranger",
  "Valdostana Suprema", "Gran Paradiso Sentinel", "Mamma Fontina", "Trekking Boss"
];

const ECO_TIPS = [
  "Rispetta i sentieri segnalati per proteggere i teneri pascoli alpini dal calpestio eccessivo.",
  "Riporta sempre a valle i tuoi rifiuti. Un pascolo pulito dona erba fresca alle nostre protette.",
  "Chiedi sempre il permesso prima di entrare nelle stalle dell'alpeggio e rispetta il silenzio dei boschi.",
  "Non spaventare le mucche al pascolo. Mantieni una distanza di sicurezza per garantire la loro quiete.",
  "Acquista la Fontina DOP direttamente dai piccoli produttori locali per sostenere l'economia degli alpeggi."
];

const LORE_SNIPPETS = [
  "Una mucca estremamente fiera e regale. Si racconta che le sue corna riflettano la luce dorata del tramonto alpino sul Cervino.",
  "Campione indiscussa delle storiche Batailles de Reines. La sua sola presenza fa tremare d'ammirazione le vette circostanti.",
  "Sviluppa una forza formidabile nutrendosi esclusivamente di trifoglio alpino d'oro e acqua purissima di ghiacciaio.",
  "Ha un legame ancestrale con la regione alpina. Scorta i trekker sul cammino offrendo confortanti incoraggiamenti silenziosi.",
  "Le leggende narrano che questa mucca leggendaria custodisca l'antico segreto per la marinatura perfetta della Mocetta alpina."
];

// Helper to generate a procedural randomized fallback Vazzamon in Italian
function simulateVazzamon(): any {
  const breedObj = AUTUMN_BREEDS[Math.floor(Math.random() * AUTUMN_BREEDS.length)];
  const name = `${FUN_COW_NAMES[Math.floor(Math.random() * FUN_COW_NAMES.length)]}`;
  const rarityPool: ('Comune' | 'Rara' | 'Epica' | 'Leggendaria')[] = ['Comune', 'Comune', 'Rara', 'Rara', 'Epica', 'Leggendaria'];
  const rarity = rarityPool[Math.floor(Math.random() * rarityPool.length)];

  let st = 30 + Math.floor(Math.random() * 40);
  let df = 35 + Math.floor(Math.random() * 45);
  let ag = 20 + Math.floor(Math.random() * 50);

  // Boost stats if rarer
  if (rarity === 'Leggendaria') {
    st += 25; df += 20; ag += 15;
  } else if (rarity === 'Epica') {
    st += 15; df += 15; ag += 10;
  }

  return {
    breed: breedObj.breed,
    name: name,
    stats: {
      strength: Math.min(st, 100),
      defense: Math.min(df, 100),
      agility: Math.min(ag, 100)
    },
    rarity: rarity,
    eco_tip: ECO_TIPS[Math.floor(Math.random() * ECO_TIPS.length)],
    lore: LORE_SNIPPETS[Math.floor(Math.random() * LORE_SNIPPETS.length)]
  };
}

// API endpoint for generating Vazzamon from scan / upload
app.post("/api/generate-vazzamon", async (req, res) => {
  try {
    const { imageBase64, isDemo = false } = req.body;

    if (isDemo) {
      // Instantly generate a premium high-stat Vazzamon for demonstration
      console.log("Serving simulated Vazzamon for DEMO request");
      return res.json({
        id: "demo-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        ...simulateVazzamon(),
        capturedAt: new Date().toISOString()
      });
    }

    if (!ai) {
      console.log("Using simulated generator because GEMINI_API_KEY is not defined.");
      return res.json({
        id: "sim-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        ...simulateVazzamon(),
        capturedAt: new Date().toISOString()
      });
    }

    const sysPrompt = `Sei un esperto Game-Designer e profondo conoscitore della cultura e del territorio della Valle d'Aosta.
Il tuo compito è analizzare la foto o l'immagine fornita. Se l'immagine contiene un elemento naturale (mucca, prato, baita, cibo alpino, pietra alpina ecc.) usalo per coniare un Vazzamon personalizzato basato sul DNA del territorio alpino.
Se l'immagine non è pertinente, immagina un simpatico Vazzamon ispirato all'energia dell'immagine inserita.

Devi generare un file JSON che rispetta accuratamente il seguente schema stringente:
{
  "breed": "tipologia bovina della Valle d'Aosta, es. Castana Valdostana",
  "name": "nome originale in stile mitico/Pokémon",
  "stats": {
    "strength": numero intero tra 20 e 100,
    "defense": numero intero tra 20 e 100,
    "agility": numero intero tra 20 e 100
  },
  "rarity": "Comune" o "Rara" o "Epica" o "Leggendaria",
  "eco_tip": "Consiglio ecologico divertente ma autentico sulla sostenibilità in montagna e rispetto dei sentieri valdostani",
  "lore": "Descrizione narrativa in italiano, spiritosa ed epica sul legame di questa mucca con il territorio alpino"
}`;

    // Structure image content parts for base64 upload if present
    let contents: any[] = [];
    if (imageBase64) {
      // split base64 to strip metadata prefix such as data:image/jpeg;base64,
      const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      let mimeType = "image/jpeg";
      let base64Data = imageBase64;

      if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Data = matches[2];
      }

      contents.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
      contents.push({
        text: "Analizza questa impronta di DNA o foto ed estrai il leggendario Vazzamon racchiuso all'interno. Fornisci un output rigoroso in formato JSON."
      });
    } else {
      contents.push({
        text: "Genera un Vazzamon a sorpresa emerso dalle vette del Gran Paradiso o dal Monte Bianco. Fornisci un output rigoroso in formato JSON."
      });
    }

    console.log("Calling Gemini 3.5-flash text/image task on server-side...");

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: sysPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            breed: { type: Type.STRING },
            name: { type: Type.STRING },
            stats: {
              type: Type.OBJECT,
              properties: {
                strength: { type: Type.INTEGER },
                defense: { type: Type.INTEGER },
                agility: { type: Type.INTEGER }
              },
              required: ["strength", "defense", "agility"]
            },
            rarity: { type: Type.STRING },
            eco_tip: { type: Type.STRING },
            lore: { type: Type.STRING }
          },
          required: ["breed", "name", "stats", "rarity", "eco_tip", "lore"]
        }
      }
    });

    const outputText = response.text || "{}";
    console.log("Gemini API returned:", outputText);
    const parsedData = JSON.parse(outputText);

    // Validate rarity matching our exact types
    const validRarities = ['Comune', 'Rara', 'Epica', 'Leggendaria'];
    let finalRarity = parsedData.rarity;
    if (!validRarities.includes(finalRarity)) {
      finalRarity = validRarities[Math.floor(Math.random() * validRarities.length)];
    }

    res.json({
      id: "gemini-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      breed: parsedData.breed || "Castana Valdostana",
      name: parsedData.name || "Reina Suprema",
      stats: {
        strength: parsedData.stats?.strength || 60,
        defense: parsedData.stats?.defense || 60,
        agility: parsedData.stats?.agility || 50
      },
      rarity: finalRarity,
      eco_tip: parsedData.eco_tip || "Riporta sempre a valle i tuoi rifiuti per proteggere gli alpeggi d'alta quota.",
      lore: parsedData.lore || "Una regale e intrepida creatura delle vette valdostane.",
      capturedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Error invoking Gemini API:", error);
    // Fall back to a beautiful simulated instance so the app never throws 500
    res.json({
      id: "err-sim-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      ...simulateVazzamon(),
      capturedAt: new Date().toISOString(),
      simulatedBecauseError: error.message
    });
  }
});

// Serve health status
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: ai ? "gemini" : "simulated" });
});

// Vite middleware configuration for serving React client
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Running in DEVELOPMENT mode. Loading Vite development middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Running in PRODUCTION mode. Serving pre-compiled static assets...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Vazzamon Server fully operational at http://localhost:${PORT}`);
  });
}

startServer();
