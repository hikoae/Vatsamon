/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '15mb' }));

// Helper to get GoogleGenAI client (Lazy Init to prevent app crash if GEMINI_API_KEY is not defined yet)
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY_MISSING');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Valle d'Aosta Trails Database
const VALDOSTANO_TRAILS = [
  {
    id: 'trail-15',
    name: 'Sentiero 15: Cogne - Rifugio Vittorio Sella',
    location: 'Gran Paradiso (Cogne)',
    difficulty: 'Moderato',
    lengthKm: 12.4,
    durationHours: 4.5,
    altitudeGain: 950,
    description: 'Stupenda escursione nell\'antico bacino reale di caccia del Gran Paradiso. Si attraversano pascoli alpini lussureggianti dove pascolano le Castane e le Pezzate Rosse.',
    responsibleTips: [
      'Mantieni una distanza minima di 5 metri dalle mucche.',
      'Non toccare i vitellini: le madri sono molto protettive.',
      'Chiudi sempre i cancelli di legno dei recinti dei pascoli per evitare che il bestiame si disperda.',
      'Cammina lungo il sentiero tracciato senza calpestare l\'erba da sfalcio.'
    ],
    cowsToEncounter: ['Castana Valdostana', 'Pezzata Rossa Valdostana']
  },
  {
    id: 'trail-1',
    name: 'Sentiero 1: Courmayeur - Rifugio Elena',
    location: 'Val Ferret',
    difficulty: 'Facile',
    lengthKm: 8.5,
    durationHours: 3.0,
    altitudeGain: 420,
    description: 'Immerso nella splendida Val Ferret con vedute mozzafiato sulle Grandes Jorasses. I pascoli pianeggianti ospitano splendidi stormi di Pezzata Nera Valdostana.',
    responsibleTips: [
      'Non urlare o fare movimenti bruschi nei pressi della mandria.',
      'Se porti un cane, mantienilo rigorosamente al guinzaglio corto.',
      'Non lanciare pietre o bastoni per allontanare le mucche.',
      'Riporta sempre a valle i tuoi rifiuti.'
    ],
    cowsToEncounter: ['Pezzata Nera Valdostana', 'Pezzata Rossa Valdostana']
  },
  {
    id: 'trail-10',
    name: 'Sentiero 10: Gressoney-La-Trinité - Lago Gabiet',
    location: 'Valle del Lys (Monte Rosa)',
    difficulty: 'Difficile',
    lengthKm: 10.2,
    durationHours: 5.0,
    altitudeGain: 880,
    description: 'Salita spettacolare sotto l\'imponente massiccio del Monte Rosa. Si passa per antichi insediamenti Walser e ricchi pascoli fioriti dominati dalla rustica Bruna Alpina.',
    responsibleTips: [
      'Le mucche al pascolo stanno lavorando per produrre il latte della Fontina DOP: lasciale mangiare in pace.',
      'Segui i consigli dei pastori se ti trovi ad attraversare una mandria in transito.',
      'Non scavalcare i recinti elettrificati per il bestiame.',
      'Rispetta il silenzio della montagna.'
    ],
    cowsToEncounter: ['Bruna Alpina', 'Castana Valdostana']
  }
];

// Educational Quiz Database
const PASTORAL_QUIZ_QUESTIONS = [
  {
    id: 'q1',
    question: 'Che cosa s\'intende storicamente per "Bataille de Reines"?',
    options: [
      'Un combattimento cruento tra tori da monta per la supremazia.',
      'Una sfilata di bellezza in cui vince la mucca con la campana più grande.',
      'Un confronto amichevole e incruento basato sulla spinta verbale e fisica delle bovine per eleggere la "Regina del pascolo".',
      'Un ballo tradizionale dei pastori di Cogne.'
    ],
    correctAnswerIndex: 2,
    explanation: 'La Bataille de Reines è una manifestazione antichissima e totalmente incruenta. Le mucche (soprattutto della razza Castana) si sfidano spingendosi fronte contro fronte finché una delle due desiste spontaneamente, determinando la gerarchia naturale della mandria.',
    difficulty: 'Facile'
  },
  {
    id: 'q2',
    question: 'Qual è il formaggio DOP più celebre della Valle d\'Aosta, prodotto esclusivamente con latte intero di bovine valdostane alimentate a pascolo?',
    options: [
      'Il Fromadzo',
      'La Fontina DOP',
      'Il Toma di Gressoney',
      'Il Lardo di Arnad'
    ],
    correctAnswerIndex: 1,
    explanation: 'La Fontina DOP viene prodotta fin dal 1200 ed è tutelata a livello europeo. Viene realizzata solo con latte crudo e intero proveniente da una singola mungitura di bovine di razza Pezzata Rossa, Pezzata Nera o Castana.',
    difficulty: 'Facile'
  },
  {
    id: 'q3',
    question: 'Qual è il comportamento corretto se incontri un cancello di legno chiuso lungo un sentiero che attraversa un pascolo?',
    options: [
      'Lasciarlo aperto per facilitare il passaggio di altri escursionisti.',
      'Scavalcarlo senza aprirlo per non danneggiare i Cardini.',
      'Aprirlo con cautela per passare, e poi richiuderlo accuratamente alle proprie spalle.',
      'Cambiare sentiero perché l\'accesso è severamente vietato agli umani.'
    ],
    correctAnswerIndex: 2,
    explanation: 'I recinti sono fondamentali per contenere il bestiame ed evitare che si disperda o finisca in zone impervie o strade. Aprili, passa e richiudili sempre con cura!',
    difficulty: 'Medio'
  },
  {
    id: 'q4',
    question: 'Perché le razze autoctone valdostane (Pezzata Rossa, Nera e Castana) sono definite "a duplice attitudine"?',
    options: [
      'Perché producono sia latte d\'alta qualità che carne, sanno muoversi agilmente sui terreni più ripidi e possiedono rusticismo e frugalità estremi.',
      'Perché fanno il bagno nei laghi alpini e corrono sulla neve.',
      'Perché sanno cantare con il campanaccio e guidare il pastore a casa.',
      'Perché sono amate sia dai turisti italiani che da quelli stranieri.'
    ],
    correctAnswerIndex: 0,
    explanation: 'Le bovine valdostane sono perfette per l\'arco alpino: sono agili arrampicatrici che producono latte straordinario per la Fontina e hanno un\'ottima muscolatura, preservando al contempo il territorio montano dal degrado.',
    difficulty: 'Medio'
  },
  {
    id: 'q5',
    question: 'A quale distanza minima dovresti posizionarti per scattare una foto ravvicinata a una mucca al pascolo?',
    options: [
      'Almeno 50 metri con un telescopio professionale.',
      'Accanto a lei, accarezzandole il muso per metterla a suo agio.',
      'Almeno 5 metri, muovendosi con calma senza posizionarsi direttamente dietro di lei.',
      '1 metro, purché le si offra del cibo salato.'
    ],
    correctAnswerIndex: 2,
    explanation: 'Mantieni sempre almeno 5 metri di distanza. La mucca è un animale grande che può spaventarsi o muoversi rapidamente soprattutto se ha un vitellino. Non metterti mai alle sue spalle per evitare calci accidentali.',
    difficulty: 'Medio'
  }
];

// NPC Pastori / Opponents Database
const NPC_OPPONENTS = [
  {
    id: 'pastore-1',
    name: 'Marco Alpino',
    title: 'Alpeggiatore di Cogne',
    avatar: '👨‍🌾',
    dialogueIntro: 'La mia mucca Bimba è la regina del vallone di Valnontey. Unisciti a noi per una spinta amichevole e mostra il valore del tuo legame bovino!',
    dialogueWin: 'Un bellissimo incontro! La tua Reina ha mostrato un grande spirito e una spinta d\'acciaio.',
    dialogueLoss: 'Bimba ha mantenuto il baricentro bene ancorato. Torna quando avrai accumulato più cammini alpini!',
    cowName: 'Bimba',
    cowBreed: 'Castana Valdostana',
    cowLevel: 4,
    cowStats: {
      strength: 55,
      resistance: 45,
      agility: 50,
      spirit: 65,
    },
    rewardXp: 150
  },
  {
    id: 'pastore-2',
    name: 'Giulia Monti',
    title: 'Pastora della Val Ferret',
    avatar: '👩‍🌾',
    dialogueIntro: 'Le mie bovine vivono all\'aria fresca sotto le Grandes Jorasses. Sei pronto a testare la regalità e la determinazione della tua mucca contro Flora?',
    dialogueWin: 'Accidenti, che manovra inaspettata! Flora si è complimentata con un bel muggito.',
    dialogueLoss: 'Flora ha la flemma dei ghiacciai del Monte Bianco. Devi allenare la tua Reina!',
    cowName: 'Flora',
    cowBreed: 'Pezzata Rossa Valdostana',
    cowLevel: 6,
    cowStats: {
      strength: 65,
      resistance: 70,
      agility: 40,
      spirit: 60,
    },
    rewardXp: 250
  },
  {
    id: 'pastore-3',
    name: 'Beppe "Courba"',
    title: 'Anziano Casaro di Challand',
    avatar: '👴',
    dialogueIntro: 'In ottant\'anni ne ho viste di Reines salire sull\'arena di Aosta. Dimmi, giovane esploratore, possiedi la regalità necessaria per sfidare Mora?',
    dialogueWin: 'Incredibile... Mi hai ricordato i leggendari tornei degli anni Settanta. Una splendida Reina!',
    dialogueLoss: 'Mora ha l\'agilità tipica delle regine nate sulle rocce. Fai camminare ancora la tua mucca per sbloccare il suo potenziale.',
    cowName: 'Mora',
    cowBreed: 'Pezzata Nera Valdostana',
    cowLevel: 10,
    cowStats: {
      strength: 75,
      resistance: 75,
      agility: 65,
      spirit: 80,
    },
    rewardXp: 500
  }
];

// Simulated DB logic when actual Gemini is unavailable/not-configured, or fallback
function generateSimulatedAnalysis(breedHint: string): any {
  let breed = 'Pezzata Rossa Valdostana';
  let rarity = 'Comune';
  let minW = 550, maxW = 680;
  let minMilk = 18, maxMilk = 26;
  let suggestedName = 'Bella';
  let desc = 'La Pezzata Rossa Valdostana è una razza bovina autoctona a duplice attitudine (latte e carne). Nota per la straordinaria robustezza e capacità di adattamento alle dure condizioni d\'alpeggio della Valle d\'Aosta.';
  let fun = 'Questa razza ha origini antichissime e fu introdotta dai Burgundi nel V secolo. È capace di camminare sui sentieri più ripidi fino a oltre 2500m di quota per pascolare l\'erba fiorita più nutriente.';
  let strength = 45, resistance = 55, agility = 40, spirit = 50;

  const hint = breedHint.toLowerCase();
  if (hint.includes('nera') || hint.includes('black') || hint.includes('pezzata nera')) {
    breed = 'Pezzata Nera Valdostana';
    rarity = 'Rara';
    suggestedName = 'Mora';
    minW = 500; maxW = 630;
    minMilk = 15; maxMilk = 22;
    desc = 'La Pezzata Nera Valdostana condivide lo stesso ceppo d\'origine della rossa ed è eccezionalmente adatta ai terreni impervi e ripidi. Presenta un temperamento vivace ma equilibrato ed è formidabile per lo sfruttamento dei pascoli montani.';
    fun = 'Spicca per la sua agilità felina: riesce ad inerpicarsi su scarpate erbose quasi verticali dove altre bovine non oserebbero addentrarsi. Produce un latte profumato ideale per Fontine dal sapore deciso.';
    strength = 50; resistance = 48; agility = 72; spirit = 60;
  } else if (hint.includes('castana') || hint.includes('chestnut') || hint.includes('brown')) {
    breed = 'Castana Valdostana';
    rarity = 'Comune';
    suggestedName = 'Brunetta';
    minW = 580; maxW = 720;
    minMilk = 14; maxMilk = 20;
    desc = 'La Castana è la regina indiscussa dei pascoli e l\'eroina assoluta delle Batailles de Reines. Di corporatura possente e carattere battagliero ma estremamente docile con l\'uomo, possiede una grande determinazione.';
    fun = 'Durante la salita all\'alpeggio, le Castane lottano istintivamente e incruentemente per definire il proprio rango gerarchico. Questo comportamento ancestrale ha dato vita alle storiche Bataille de Reines della Valle d\'Aosta.';
    strength = 75; resistance = 65; agility = 55; spirit = 85;
  } else if (hint.includes('bruna') || hint.includes('alpina')) {
    breed = 'Bruna Alpina';
    rarity = 'Leggendaria';
    suggestedName = 'Zirbila';
    minW = 600; maxW = 750;
    minMilk = 22; maxMilk = 32;
    desc = 'La Bruna Alpina è rinomata per la grande docilità e l\'eccezionale qualità del latte, ricco di proteine ideali per la caseificazione alpina. È un\'altra razza nobilissima diffusa in tutta la regione.';
    fun = 'Il suo campanaccio armonioso produce rintocchi cristallini che si diffondono per chilometri lungo le valli valdostane, creando l\'iconica sinfonia d\'alpeggio.';
    strength = 60; resistance = 78; agility = 45; spirit = 55;
  }

  // Randomize stats slightly
  const weight = Math.floor(Math.random() * (maxW - minW) + minW);
  const milkProduction = Math.floor(Math.random() * (maxMilk - minMilk) + minMilk);

  return {
    isCow: true,
    breed,
    rarity,
    suggestedName,
    weight,
    milkProduction,
    description: desc,
    funFact: fun,
    safeDistanceEvaluation: 'L\'immagine dimostra un approccio eccellente e responsabile. La mucca appare tranquilla, e la distanza stimata è di circa 6 metri, perfetta per non turbarne l\'alimentazione.',
    combatStats: {
      strength: Math.min(95, Math.max(10, strength + Math.floor(Math.random() * 10 - 5))),
      resistance: Math.min(95, Math.max(10, resistance + Math.floor(Math.random() * 10 - 5))),
      agility: Math.min(95, Math.max(10, agility + Math.floor(Math.random() * 10 - 5))),
      spirit: Math.min(95, Math.max(10, spirit + Math.floor(Math.random() * 10 - 5))),
    }
  };
}

// REST APIs
app.get('/api/trails', (req, res) => {
  res.json(VALDOSTANO_TRAILS);
});

app.get('/api/quiz', (req, res) => {
  // Return the entire database of queries
  res.json(PASTORAL_QUIZ_QUESTIONS);
});

app.get('/api/opponents', (req, res) => {
  res.json(NPC_OPPONENTS);
});

// COW BREED RECOGNITION API VIA GEMINI
app.post('/api/identify-cow', async (req, res) => {
  const { image, breedHint } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Nessun file immagine o stringa base64 fornito.' });
  }

  try {
    let base64Data = '';
    let mimeType = 'image/png';

    // 1. Detect if it's a local file path or base64 data
    if (image.startsWith('data:image/')) {
      const parts = image.split(',');
      base64Data = parts[1];
      const mimeMatch = image.match(/data:(image\/\w+);base64/);
      if (mimeMatch) {
         mimeType = mimeMatch[1];
      }
    } else if (image.startsWith('/') || image.startsWith('src/')) {
      // User passed a local demo image like "/src/assets/images/pezzata_rossa.png"
      const relativePath = image.startsWith('/') ? image.substring(1) : image;
      const absolutePath = path.resolve('.', relativePath);
      
      if (fs.existsSync(absolutePath)) {
        const fileBuffer = fs.readFileSync(absolutePath);
        base64Data = fileBuffer.toString('base64');
        mimeType = absolutePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
      } else {
        // Fallback if images cannot be found on system
        console.warn(`Local demo image not found on disk: ${absolutePath}, falling back to simulated analysis.`);
        const mockResult = generateSimulatedAnalysis(breedHint || image);
        return res.json({ result: mockResult, simulated: true });
      }
    } else {
      base64Data = image; // Raw base64 fallback
    }

    // 2. Check if Gemini Client is initialized
    let ai;
    try {
      ai = getAIClient();
    } catch (err: any) {
      if (err.message === 'GEMINI_API_KEY_MISSING') {
        console.info('GEMINI_API_KEY is not defined. Falling back to high-fidelity simulated AI matching.');
        const mockResult = generateSimulatedAnalysis(breedHint || 'pezzata rossa');
        return res.json({ result: mockResult, simulated: true, warning: 'Senza chiave API' });
      }
      throw err;
    }

    // 3. Prepare Image Part and prompt for Gemini
    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    };

    const promptText = `Identifica la razza di questa mucca/bovino. 
Ti preghiamo di restituire la risposta tassativamente in formato JSON secondo lo schema richiesto.
Se l'immagine NON contiene chiaramente una mucca o una mucca montana, imposta isCow = false.
Le razze valdostane e alpine principali da riconoscere sono:
- 'Pezzata Rossa Valdostana' (red & white spots, strong)
- 'Pezzata Nera Valdostana' (black & white spots, agile climber)
- 'Castana Valdostana' (sleek chestnut, dark brown or almost black, muscular and fierce but friendly, traditional queen of battles)
- 'Bruna Alpina' (greyish-brown coat, high milk production)
- 'Frisona' (standard black & white piebald milk cow)

Analizza anche se l'inquadratura rispetta lo spirito della pastorizia e dell'esplorazione responsabile in Valle d'Aosta (mantenendo almeno 5m di distanza, nessun comportamento invasivo, rispetto del silenzio d'alpeggio).
Inventa un nome simpatico italiano/valdostano per questa mucca in 'suggestedName' (es. Flora, Mora, Bimba, Stellina, Cervina, Regina, Brunetta, Carena, Nera).`;

    // 4. Request Structured JSON Content from Gemini 3.5 Flash
    console.log('Sending photo to Gemini API validation...');
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: { parts: [imagePart, { text: promptText }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCow: { type: Type.BOOLEAN, description: 'True se l\'immagine è effettivamente una mucca, altrimenti false.' },
            breed: { type: Type.STRING, description: 'Nome esatto della razza, es: Pezzata Rossa Valdostana, Pezzata Nera Valdostana, Castana Valdostana, Bruna Alpina.' },
            rarity: { type: Type.STRING, description: 'Rarietà tra: Comune, Rara, Leggendaria.' },
            suggestedName: { type: Type.STRING, description: 'Nome simpatico valdostano o alpino suggerito per questo particolare bovino.' },
            weight: { type: Type.INTEGER, description: 'Peso stimato approssimativo in kg (intero p.es. 500-750)' },
            milkProduction: { type: Type.INTEGER, description: 'Stima del latte prodotto in alpeggio litri/giorno (intero p.es. 12-32)' },
            description: { type: Type.STRING, description: 'Descrizione culturale ed educativa splendida e accurata del bovino e del suo ruolo in Valle d\'Aosta in lingua italiana.' },
            funFact: { type: Type.STRING, description: 'Un aneddoto o fatto curioso pazzesco sulla razza o sulla vita d\'alpeggio in lingua italiana.' },
            safeDistanceEvaluation: { type: Type.STRING, description: 'Una valutazione educativa dell\'immagine per spiegare se è stata presa in modo rispettosa o troppo ravvicinata, con consigli di sicurezza alpina in lingua italiana.' },
            combatStats: {
              type: Type.OBJECT,
              properties: {
                strength: { type: Type.INTEGER, description: 'Forza di spinta (punteggio intero da 20 a 95)' },
                resistance: { type: Type.INTEGER, description: 'Resistenza e postura (punteggio intero da 20 a 95)' },
                agility: { type: Type.INTEGER, description: 'Agilità negli spostamenti d\'alpeggio (punteggio intero da 20 a 95)' },
                spirit: { type: Type.INTEGER, description: 'Regalità e grinta per la Bataille (punteggio intero da 25 a 95)' }
              },
              required: ['strength', 'resistance', 'agility', 'spirit']
            }
          },
          required: ['isCow', 'breed', 'rarity', 'suggestedName', 'weight', 'milkProduction', 'description', 'funFact', 'safeDistanceEvaluation', 'combatStats'],
        },
      },
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("L'IA non ha risposto alcun testo valido.");
    }

    const cleanJson = JSON.parse(textOutput.trim());
    return res.json({ result: cleanJson, simulated: false });

  } catch (err: any) {
    console.error('Error in identify-cow API:', err);
    // Secure failover gracefully so the app stays functional with mock analysis if real fails or is offline
    const fallbackHint = breedHint || 'pezzata rossa';
    const fallbackResult = generateSimulatedAnalysis(fallbackHint);
    return res.status(200).json({
      result: fallbackResult,
      simulated: true,
      error: err.message || err,
      warning: 'Eseguito in modalità failover automatico per limite rete o credenziali.'
    });
  }
});

// Configure Vite integration for dev server or static server for production build
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting server in Development Mode with Vite middlewares...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    // Serve index.html dynamically
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve('.', 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    console.log('Starting server in Production Mode serving static assets...');
    // Serve dist static assets
    app.use(express.static(path.resolve('.', 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('.', 'dist', 'index.html'));
    });
  }

  // PORT 3000 is strictly reserved and required by reverse-proxy
  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Vatsadex Server fully listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((e) => {
  console.error("Failed to start server:", e);
});
