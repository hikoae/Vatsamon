/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import {
  Camera,
  Compass,
  Award,
  BookOpen,
  Sparkles,
  Grid,
  Volume2,
  Edit2,
  Plus,
  Minus,
  Info,
  X,
  CheckCircle,
  AlertTriangle,
  Trophy,
  Activity,
  Heart,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  Search,
  SlidersHorizontal
} from 'lucide-react';

import { OpenSourceTrailMap } from './components/OpenSourceTrailMap';

import {
  VALDOSTANO_TRAILS,
  INITIAL_VAZZADEX,
  DEMO_COWS,
  INITIAL_ACHIEVEMENTS,
  type Cow,
  type ValdostanTrail,
  type Achievement
} from './utils/trails';

import { HISTORIC_BOVINES_DATABASE, type HistoricCow } from './utils/bovineDatabase';

import { playSynthSound } from './utils/audio';

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

export default function App() {
  // --- Persistent State ---
  const [vazzadex, setVazzadex] = useState<Cow[]>(() => {
    const saved = localStorage.getItem('vazzadex_cows');
    return saved ? JSON.parse(saved) : INITIAL_VAZZADEX;
  });

  const [distanceWalked, setDistanceWalked] = useState<number>(() => {
    const saved = localStorage.getItem('vazzadex_km');
    return saved ? parseFloat(saved) : 12.4;
  });

  const [explorerXp, setExplorerXp] = useState<number>(() => {
    const saved = localStorage.getItem('vazzadex_xp');
    return saved ? parseInt(saved, 10) : 340;
  });

  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const saved = localStorage.getItem('vazzadex_achievements');
    return saved ? JSON.parse(saved) : INITIAL_ACHIEVEMENTS;
  });

  const [activeLeaderboard, setActiveLeaderboard] = useState<{ name: string; title: string; score: number; cow: string; isUser?: boolean }[]>(() => {
    const saved = localStorage.getItem('vazzadex_leaderboard');
    if (saved) return JSON.parse(saved);
    return [
      { name: 'Marco Alpino', title: 'Alpeggiatore di Cogne', score: 2450, cow: 'Bimba' },
      { name: 'Tu (Esploratore)', title: 'Reina: "Mora"', score: 2120, cow: 'Bimba', isUser: true },
      { name: 'Giulia Monti', title: 'Pastora della Val Ferret', score: 1890, cow: 'Flora' }
    ];
  });

  const [pastureTreats, setPastureTreats] = useState<number>(() => {
    const saved = localStorage.getItem('vazzadex_treats');
    return saved ? parseInt(saved, 10) : 3;
  });

  // --- UI/Tab/Local State ---
  const [activeTab, setActiveTab] = useState<'radar' | 'camera' | 'vazzadex' | 'bataille' | 'quiz'>('radar');
  const [selectedTrail, setSelectedTrail] = useState<ValdostanTrail>(VALDOSTANO_TRAILS[0]);
  const [scannedCowResult, setScannedCowResult] = useState<any | null>(null);
  
  // Last captured cow display in sidebar
  const lastCapturedCow = vazzadex[vazzadex.length - 1] || null;

  // Active champion for battles (default is the first cow)
  const [championId, setChampionId] = useState<string>(vazzadex[0]?.id || 'pre-captured-1');
  const activeChampion = vazzadex.find(c => c.id === championId) || vazzadex[0] || INITIAL_VAZZADEX[0];

  // Map & Walk simulation states
  const [isWalking, setIsWalking] = useState(false);
  const [walkMessage, setWalkMessage] = useState('');
  const [randomEncounterSpotted, setRandomEncounterSpotted] = useState<{ breed: string; distance: number; demoId: string } | null>(null);

  // Camera states
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [selectedDemoCow, setSelectedDemoCow] = useState<string>('demo-rossa');
  const [isScanning, setIsScanning] = useState(false);
  const [scanSpeed, setScanSpeed] = useState('ia-real'); // or 'demo'
  const [customFileBase64, setCustomFileBase64] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Remailing/editing state
  const [renamingCowId, setRenamingCowId] = useState<string | null>(null);
  const [newCowName, setNewCowName] = useState('');

  // Bataille Arena state
  const [selectedOpponentId, setSelectedOpponentId] = useState<string>('pastore-1');
  const [battleState, setBattleState] = useState<'idle' | 'intro' | 'active' | 'win' | 'loss'>('idle');
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [pullProgress, setPullProgress] = useState(50); // 0 (User wins) to 100 (NPC wins)
  const [sliderPosition, setSliderPosition] = useState(10); // 0 to 100 for rhythm bar
  const [sliderDirection, setSliderDirection] = useState<'forward' | 'backward'>('forward');
  const [opponentEnergy, setOpponentEnergy] = useState(100);
  const [championEnergy, setChampionEnergy] = useState(100);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // --- Vazzadex Registry States ---
  const [vazzadexSubTab, setVazzadexSubTab] = useState<'my_cows' | 'registry'>('my_cows');
  const [registrySearchQuery, setRegistrySearchQuery] = useState('');
  const [registryCategoryFilter, setRegistryCategoryFilter] = useState<'All' | '1ª Categoria' | '2ª Categoria' | '3ª Categoria' | 'Manze (Génisses)'>('All');
  const [registryBreedFilter, setRegistryBreedFilter] = useState<'All' | 'Castana Valdostana' | 'Pezzata Nera Valdostana' | 'Pezzata Rossa Valdostana'>('All');

  // Environmental rotating tips in footer
  const [tipIndex, setTipIndex] = useState(0);
  const environmentalTips = [
    'CONSIGLIO RESPONSABILE: Mantieni almeno 5 metri di distanza dalle mucche e non dondolare fieno o provocare rumore durante lo scatto.',
    'CONSIGLIO RESPONSABILE: Chiudi sempre i cancelli di legno dei pascoli. Impedisce alle mucche di perdersi o scendere su strade statali ripide.',
    'CONSIGLIO RESPONSABILE: Se cammini con il tuo cane, mantienilo rigorosamente al guinzaglio corto. Le mucche lo vedono come un predatore naturale.',
    'CONSIGLIO RESPONSABILE: Non raccogliere fiori alpini rari raggruppati vicino alle fonti d\'acqua dei pascoli: sono l\'ecosistema vitale degli insetti impollinatori.'
  ];

  // Helper calculation for levels
  const currentLevel = Math.floor(explorerXp / 200) + 1;
  const currentLevelXpProgress = explorerXp % 200;

  // Sync state with LocalStorage
  useEffect(() => {
    localStorage.setItem('vazzadex_cows', JSON.stringify(vazzadex));
  }, [vazzadex]);

  useEffect(() => {
    localStorage.setItem('vazzadex_km', distanceWalked.toFixed(1));
  }, [distanceWalked]);

  useEffect(() => {
    localStorage.setItem('vazzadex_xp', explorerXp.toString());
  }, [explorerXp]);

  useEffect(() => {
    localStorage.setItem('vazzadex_achievements', JSON.stringify(achievements));
  }, [achievements]);

  useEffect(() => {
    localStorage.setItem('vazzadex_leaderboard', JSON.stringify(activeLeaderboard));
  }, [activeLeaderboard]);

  useEffect(() => {
    localStorage.setItem('vazzadex_treats', pastureTreats.toString());
  }, [pastureTreats]);

  // Rotator tips timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % environmentalTips.length);
    }, 9000);
    return () => clearInterval(timer);
  }, []);

  // Fetch quizzes and opponents on startup
  useEffect(() => {
    fetch('/api/quiz')
      .then((res) => res.json())
      .then((data) => setQuizQuestions(data))
      .catch((err) => console.error('Error getting quiz:', err));
  }, []);

  // Rhythm slider tick for Bataille battle game
  useEffect(() => {
    let interval: any = null;
    if (battleState === 'active') {
      interval = setInterval(() => {
        setSliderPosition((prev) => {
          let next;
          if (sliderDirection === 'forward') {
            next = prev + 5;
            if (next >= 100) {
              setSliderDirection('backward');
              return 100;
            }
          } else {
            next = prev - 5;
            if (next <= 0) {
              setSliderDirection('forward');
              return 0;
            }
          }
          return next;
        });

        // Opponent pushes back periodically
        if (Math.random() < 0.12) {
          setPullProgress((prev) => {
            const next = Math.min(95, prev + Math.floor(Math.random() * 8 + 3));
            return next;
          });
          const opponent = NPC_OPPONENTS.find(o => o.id === selectedOpponentId);
          addBattleLog(`La Reina avversaria "${opponent?.cowName}" spinge con fermezza alpina!`);
        }
      }, 70);
    }
    return () => clearInterval(interval);
  }, [battleState, sliderDirection, selectedOpponentId]);

  // Check battle ending conditions
  useEffect(() => {
    if (battleState === 'active') {
      if (pullProgress <= 10) { // User wins (pushed left)
        setBattleState('win');
        playSynthSound('success');
        addBattleLog(`STREPITOSO! La tua Reina "${activeChampion.name}" vince l'incontro spingendo l'avversaria oltre i limiti della pista!`);
        
        // Award XP and Treats
        const op = NPC_OPPONENTS.find(o => o.id === selectedOpponentId);
        const xpYield = op ? op.rewardXp : 150;
        unlockAchievement('ach-3');
        addExplorerXp(xpYield);
        setPastureTreats(prev => prev + 1);

        // Level up the winning cow
        setVazzadex(prev => prev.map(c => {
          if (c.id === championId) {
            return { ...c, level: c.level + 1, combatStats: {
              strength: Math.min(99, c.combatStats.strength + 2),
              resistance: Math.min(99, c.combatStats.resistance + 1),
              agility: Math.min(99, c.combatStats.agility + 1),
              spirit: Math.min(99, c.combatStats.spirit + 3),
            }};
          }
          return c;
        }));

        // Upgrade dynamic leaderboard score
        setActiveLeaderboard(prev => {
          const updated = prev.map(item => {
            if (item.isUser) {
              return { ...item, score: item.score + xpYield, cow: activeChampion.name };
            }
            return item;
          });
          // Sort descending
          return updated.sort((a, b) => b.score - a.score);
        });

      } else if (pullProgress >= 90) { // NPC wins (pushed right)
        setBattleState('loss');
        playSynthSound('muggito');
        const op = NPC_OPPONENTS.find(o => o.id === selectedOpponentId);
        addBattleLog(`La Reina "${op?.cowName}" ha dominato il baricentro dell'arena. "${activeChampion.name}" preferisce indietreggiare amichevolmente.`);
      }
    }
  }, [pullProgress, battleState]);

  // Handle camera capture or file preview
  const handleStartCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasCameraPermission(true);
      }
    } catch (err) {
      console.warn('Camera access error or unsupported:', err);
      setHasCameraPermission(false);
      setCameraError('Impossibile accedere alla webcam o permessi negati. Usa l\'uploader o seleziona una delle mucche campione qui sotto per simulare il radar alpeggio!');
    }
  };

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setHasCameraPermission(null);
  };

  // Helper to add XP
  const addExplorerXp = (amount: number) => {
    setExplorerXp((prev) => {
      const next = prev + amount;
      const oldLvl = Math.floor(prev / 200) + 1;
      const newLvl = Math.floor(next / 200) + 1;
      if (newLvl > oldLvl) {
        setTimeout(() => playSynthSound('levelUp'), 400);
      }
      return next;
    });
  };

  // Trigger achievements unlocks
  const unlockAchievement = (id: string) => {
    setAchievements((prev) =>
      prev.map((ach) => {
        if (ach.id === id && !ach.unlockedAt) {
          playSynthSound('success');
          return { ...ach, unlockedAt: new Date().toISOString().substring(0, 10) };
        }
        return ach;
      })
    );
  };

  // --- Walk Simulation on Trail map ---
  const handleSimulateWalk = () => {
    if (isWalking) return;
    setIsWalking(true);
    setWalkMessage('Stai risalendo i pascoli del sentiero valdostano...');
    playSynthSound('clink');

    let steps = 0;
    const interval = setInterval(() => {
      steps += 1;
      setDistanceWalked((prev) => prev + 0.1);
      
      if (steps >= 5) {
        clearInterval(interval);
        setIsWalking(false);
        setWalkMessage('Hai completato un pezzo di sentiero montuoso!');
        addExplorerXp(25);
        unlockAchievement('ach-2');

        // Chance to encounter an alpine cow randomly
        if (Math.random() < 0.7) {
          playSynthSound('muggito');
          const possibleDemos = DEMO_COWS.filter(c => 
            selectedTrail.cowsToEncounter.includes(c.breed) || c.breed.includes('Bruna')
          );
          const chosenDemo = possibleDemos[Math.floor(Math.random() * possibleDemos.length)] || DEMO_COWS[0];
          
          setRandomEncounterSpotted({
            breed: chosenDemo.breed,
            distance: Math.floor(Math.random() * 4 + 4), // 4 to 8 meters
            demoId: chosenDemo.id
          });
        }
      }
    }, 600);
  };

  // Switch to camera and load encountered wild cow
  const handleCaptureEncounter = (demoId: string) => {
    setSelectedDemoCow(demoId);
    setRandomEncounterSpotted(null);
    setActiveTab('camera');
    handleStartCamera();
  };

  // Trigger file selection for cow upload
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomFileBase64(reader.result as string);
        setSelectedDemoCow(''); // unselect demo so it uses the file
      };
      reader.readAsDataURL(file);
    }
  };

  // CORE CALL: Call server-side API proxying Gemini 3.5 Flash
  const handleScanBovine = async () => {
    setIsScanning(true);
    setScannedCowResult(null);
    playSynthSound('clink');

    const loadingChime = setInterval(() => {
      playSynthSound('clink');
    }, 1500);

    try {
      let imageParam = '';
      let breedHintName = '';

      if (customFileBase64) {
        imageParam = customFileBase64;
        breedHintName = 'immagine caricata';
      } else {
        // Use demo cow or snapshot
        const selectedOption = DEMO_COWS.find(c => c.id === selectedDemoCow);
        if (selectedOption) {
          imageParam = selectedOption.imagePath || 'pezzata rossa'; // pass path so server reads disk or fallbacks
          breedHintName = selectedOption.hint;
        } else {
          // Attempt canvas frame capture from webcam if active
          if (videoRef.current && hasCameraPermission) {
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
              imageParam = canvas.toDataURL('image/jpeg');
              breedHintName = 'scatto live webcam';
            }
          } else {
            // Ultimate fallback
            imageParam = '/src/assets/images/pezzata_rossa.png';
            breedHintName = 'pezzata rossa';
          }
        }
      }

      // Call Express API endpoint
      const response = await fetch('/api/identify-cow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageParam, breedHint: breedHintName }),
      });

      const data = await response.json();
      clearInterval(loadingChime);

      if (data && data.result) {
        setScannedCowResult(data.result);
        playSynthSound('muggito');
        setTimeout(() => playSynthSound('success'), 600);

        // Add newly identified cow to the Vazzadex if she is a cow!
        if (data.result.isCow) {
          const newCow: Cow = {
            id: `cow-${Date.now()}`,
            name: data.result.suggestedName,
            breed: data.result.breed,
            rarity: data.result.rarity,
            level: 1,
            xp: 0,
            weight: data.result.weight,
            milkProduction: data.result.milkProduction,
            capturedAt: new Date().toISOString().substring(0, 10),
            capturedLocation: selectedTrail.name,
            combatStats: data.result.combatStats,
            customPhoto: customFileBase64 || (DEMO_COWS.find(c => c.id === selectedDemoCow)?.imagePath || '/src/assets/images/pezzata_rossa.png'),
            description: data.result.description,
            funFact: data.result.funFact,
            safeDistanceEvaluation: data.result.safeDistanceEvaluation
          };

          // Append to state, prevent duplicates of the exact breed if we want but PokemonGO allows collecting multiple!
          setVazzadex(prev => [...prev, newCow]);
          // Automatically set as active champion if player wants
          setChampionId(newCow.id);

          // Update species caught metric
          unlockAchievement('ach-1');
          addExplorerXp(120);
        }
      } else {
        throw new Error('Formato risposta non valido.');
      }
    } catch (err) {
      clearInterval(loadingChime);
      console.error(err);
      alert('Contatto fallito con il server pastorale. Ripristino del classificatore locale.');
    } finally {
      setIsScanning(false);
    }
  };

  // --- Change cows name ---
  const handleRenameCow = (cowId: string) => {
    if (!newCowName.trim()) return;
    setVazzadex(prev => prev.map(c => {
      if (c.id === cowId) {
        return { ...c, name: newCowName.trim() };
      }
      return c;
    }));
    setRenamingCowId(null);
    setNewCowName('');
    playSynthSound('success');
  };

  // --- Feeding treats to level up ---
  const handleFeedTreast = (cowId: string) => {
    if (pastureTreats <= 0) return;
    setPastureTreats(p => p - 1);
    setVazzadex(prev => prev.map(c => {
      if (c.id === cowId) {
        playSynthSound('levelUp');
        return {
          ...c,
          level: c.level + 1,
          weight: c.weight + Math.floor(Math.random() * 12 + 4),
          combatStats: {
            strength: Math.min(99, c.combatStats.strength + 3),
            resistance: Math.min(99, c.combatStats.resistance + 3),
            agility: Math.min(99, c.combatStats.agility + 2),
            spirit: Math.min(99, c.combatStats.spirit + 4)
          }
        };
      }
      return c;
    }));
  };

  const handleAdoptHistoricCow = (hc: HistoricCow) => {
    const alreadyCaptured = vazzadex.some(c => c.name.toLowerCase() === hc.name.toLowerCase() && c.breed === hc.breed);
    if (alreadyCaptured) {
      alert(`Hai già ${hc.name} nel tuo alpeggio personale!`);
      return;
    }

    let rarityCompat: 'Comune' | 'Rara' | 'Leggendaria' = 'Comune';
    if (hc.rarity === 'Leggendaria') {
      rarityCompat = 'Leggendaria';
    } else if (hc.rarity === 'Epica' || hc.rarity === 'Rara') {
      rarityCompat = 'Rara';
    }

    const newCow: Cow = {
      id: `cow-historic-${hc.id}-${Date.now()}`,
      name: hc.name,
      breed: hc.breed,
      rarity: rarityCompat,
      level: 1,
      xp: 0,
      weight: hc.weight,
      milkProduction: hc.breed === 'Pezzata Rossa Valdostana' ? 28 : (hc.breed === 'Pezzata Nera Valdostana' ? 18 : 12),
      capturedAt: new Date().toISOString().substring(0, 10),
      capturedLocation: `${hc.comune} (${hc.category})`,
      combatStats: {
        strength: hc.combatStats.strength,
        resistance: hc.combatStats.resistance,
        agility: hc.combatStats.agility,
        spirit: hc.combatStats.spirit
      },
      description: hc.note || `Regina registrata ufficiale dell'Association régionale Amis des Batailles des Reines. Piazzamento: ${hc.recognition}.`,
      funFact: hc.specialAward ? `Vincitrice del premio speciale ${hc.specialAward}.` : `Orgoglio bovino di proprietà di ${hc.owner} di ${hc.comune}.`
    };

    newCow.customPhoto = hc.imagePath || (
      hc.breed === 'Castana Valdostana' ? '/src/assets/images/castana.png' :
      hc.breed === 'Pezzata Nera Valdostana' ? '/src/assets/images/pezzata_nera.png' :
      '/src/assets/images/pezzata_rossa.png'
    );

    setVazzadex(prev => [...prev, newCow]);
    setChampionId(newCow.id); // Automatically set as champion!
    playSynthSound('success');
  };

  // --- Bataille de Reines interactive Logic ---
  const activeOpponent = NPC_OPPONENTS.find(o => o.id === selectedOpponentId) || NPC_OPPONENTS[0];

  const handleStartBattle = () => {
    setBattleState('intro');
    setPullProgress(50);
    setOpponentEnergy(100);
    setChampionEnergy(100);
    setBattleLog([
      `Inizio dell'incontro amichevole di Bataille de Reines!`,
      `Pastore ${activeOpponent.name} presenta la sua campionessa "${activeOpponent.cowName}" (Lv.${activeOpponent.cowLevel}).`,
      `Hai selezionato la tua fidata "${activeChampion.name}" (Lv.${activeChampion.level}) della razza ${activeChampion.breed}.`,
      `Le bovine si scrutano con rispetto reciproco.`
    ]);
    playSynthSound('muggito');
  };

  const handleStartSimulatedCombatAction = () => {
    setBattleState('active');
    addBattleLog(`COMBATTIMENTO ATTIVO! Schiaccia "SPINGI CON REGALITÀ" quando la freccia si trova nella zona VERDE della barra del baricentro!`);
  };

  const addBattleLog = (msg: string) => {
    setBattleLog(prev => [msg, ...prev.slice(0, 15)]);
  };

  const handlePushCombatTrigger = () => {
    if (battleState !== 'active') return;
    playSynthSound('clink');

    // Determine precision based on slider position (perfect is near center 50)
    const distanceToCenter = Math.abs(sliderPosition - 50);
    let hitStrength = 0;
    
    if (distanceToCenter <= 10) { // Perfect green zone
      hitStrength = 12 + Math.floor(activeChampion.combatStats.strength / 10);
      addBattleLog(`💥 SPINTA PERFETTA! "${activeChampion.name}" sfoggia una forza maestosa trascinando l'avversaria all'indietro!`);
      playSynthSound('success');
    } else if (distanceToCenter <= 25) { // Good yellow zone
      hitStrength = 6 + Math.floor(activeChampion.combatStats.strength / 20);
      addBattleLog(`💪 BUON COLPO! "${activeChampion.name}" tiene fermo il terreno e avanza d'orgoglio.`);
    } else { // Bad red boundary zone
      hitStrength = -5;
      addBattleLog(`⚠️ MANOVRA INSICURA. "${activeOpponent.cowName}" ne approfitta per caricare con la schiena!`);
    }

    // Apply pull change (subtract push from progress, 0 is player win)
    setPullProgress(prev => {
      const next = Math.max(5, Math.min(95, prev - hitStrength));
      return next;
    });

    // Reduce slightly player/NPC aesthetic energies
    setChampionEnergy(e => Math.max(20, e - Math.floor(Math.random() * 4)));
    setOpponentEnergy(e => Math.max(20, e - Math.max(2, Math.floor(hitStrength / 1.5))));
  };

  // --- Quiz Answers selection ---
  const handleSelectAnswer = (idx: number) => {
    if (quizSubmitted) return;
    setSelectedAnswerIndex(idx);
  };

  const handleSubmitQuizAnswer = () => {
    if (selectedAnswerIndex === null || quizSubmitted) return;
    setQuizSubmitted(true);
    
    const currentQ = quizQuestions[currentQuestionIndex];
    const isCorrect = selectedAnswerIndex === currentQ.correctAnswerIndex;
    
    if (isCorrect) {
      playSynthSound('success');
      setCorrectAnswersCount(prev => prev + 1);
      setPastureTreats(prev => prev + 1);
      addExplorerXp(30);
    } else {
      playSynthSound('muggito');
    }
  };

  const handleNextQuizQuestion = () => {
    setSelectedAnswerIndex(null);
    setQuizSubmitted(false);
    
    if (currentQuestionIndex + 1 < quizQuestions.length) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setQuizCompleted(true);
      unlockAchievement('ach-4');
    }
  };

  const handleResetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswerIndex(null);
    setQuizSubmitted(false);
    setCorrectAnswersCount(0);
    setQuizCompleted(false);
  };

  return (
    <div id="vazzadec-root" className="w-full min-h-screen bg-[#f5f5f0] text-[#2d2d2a] font-sans flex flex-col overflow-x-hidden">
      
      {/* Top Header / Bar styled according to theme */}
      <nav id="vazzadec-navbar" className="bg-[#5A5A40] text-white py-4 px-6 md:px-8 flex flex-col md:flex-row items-center justify-between shadow-md gap-4 relative z-10 border-b-2 border-[#4a4a34]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#d4a373] rounded-full border-2 border-white flex items-center justify-center shadow-md animate-bounce">
            <span className="text-3xl">🐮</span>
          </div>
          <div>
            <h1 className="text-2xl font-serif font-black tracking-tight flex items-center gap-2">
              VAZZADEX <span className="text-[#e9edc9] italic text-base font-normal">BovineGO!</span>
            </h1>
            <p className="text-xs text-[#e9edc9] opacity-90 uppercase tracking-widest font-mono">
              Valle d'Aosta • {selectedTrail.location}
            </p>
          </div>
        </div>

        {/* Level and Global stats */}
        <div className="flex flex-wrap items-center gap-6 md:gap-8 justify-center">
          <div className="text-center md:text-right min-w-[150px]">
            <div className="text-[10px] uppercase tracking-wider opacity-70 font-bold">Livello Esploratore</div>
            <div className="flex items-center gap-2 md:justify-end">
              <span className="font-extrabold text-xl font-serif text-[#faedcd]">LV. {currentLevel}</span>
              <div className="w-28 h-2.5 bg-[#4a4a34] rounded-full overflow-hidden border border-[#d4a373]">
                <div 
                  className="h-full bg-[#d4a373] transition-all duration-300"
                  style={{ width: `${(currentLevelXpProgress / 200) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="text-[10px] opacity-60 font-mono text-right">{currentLevelXpProgress}/200 XP</div>
          </div>

          <div className="flex gap-4">
            <div className="bg-[#4a4a34] px-4 py-2 rounded-xl text-center min-w-[70px] border border-[#e9edc9]/20 shadow-inner">
              <span className="block text-[10px] uppercase opacity-60 font-bold">Km Percorsi</span>
              <span className="font-serif font-bold text-lg text-white">{distanceWalked.toFixed(1)}</span>
            </div>
            <div className="bg-[#4a4a34] px-4 py-2 rounded-xl text-center min-w-[70px] border border-[#e9edc9]/20 shadow-inner">
              <span className="block text-[10px] uppercase opacity-60 font-bold">Vazzadex</span>
              <span className="font-serif font-bold text-lg text-[#faedcd]">{vazzadex.length} Unità</span>
            </div>
            <div className="bg-[#4a4a34] px-4 py-2 rounded-xl text-center min-w-[70px] border border-[#e9edc9]/20 shadow-inner">
              <span className="block text-[10px] uppercase opacity-60 font-bold text-[#fefae0]">Biscotti 🍪</span>
              <span className="font-serif font-bold text-lg text-[#faedcd]">{pastureTreats}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Grid View */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side Tab Navigation Panel */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Quick tab switcher with rustic tags */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-[#e2e2d9] rounded-2xl border border-[#d6d6cc]">
            <button
              onClick={() => { setActiveTab('radar'); playSynthSound('clink'); }}
              className={`flex-1 min-w-[120px] transition-all duration-200 py-3 px-4 rounded-xl font-serif italic text-sm flex items-center justify-center gap-2 ${
                activeTab === 'radar' 
                  ? 'bg-[#5A5A40] text-white shadow-md' 
                  : 'bg-white/20 text-[#5A5A40] hover:bg-white/50'
              }`}
            >
              <Compass size={16} /> RADAR SENTIERI
            </button>
            <button
              onClick={() => { setActiveTab('camera'); handleStartCamera(); }}
              className={`flex-1 min-w-[120px] transition-all duration-200 py-3 px-4 rounded-xl font-serif italic text-sm flex items-center justify-center gap-2 ${
                activeTab === 'camera' 
                  ? 'bg-[#5A5A40] text-white shadow-md' 
                  : 'bg-white/20 text-[#5A5A40] hover:bg-white/50'
              }`}
            >
              <Camera size={16} /> SCANNER IA 📷
            </button>
            <button
              onClick={() => { setActiveTab('vazzadex'); playSynthSound('clink'); }}
              className={`flex-1 min-w-[120px] transition-all duration-200 py-3 px-4 rounded-xl font-serif italic text-sm flex items-center justify-center gap-2 ${
                activeTab === 'vazzadex' 
                  ? 'bg-[#5A5A40] text-white shadow-md' 
                  : 'bg-white/20 text-[#5A5A40] hover:bg-white/50'
              }`}
            >
              <Grid size={16} /> VAZZADEX
            </button>
            <button
              onClick={() => { setActiveTab('bataille'); playSynthSound('clink'); }}
              className={`flex-1 min-w-[120px] transition-all duration-200 py-3 px-4 rounded-xl font-serif italic text-sm flex items-center justify-center gap-2 ${
                activeTab === 'bataille' 
                  ? 'bg-[#5A5A40] text-white shadow-md' 
                  : 'bg-white/20 text-[#5A5A40] hover:bg-white/50'
              }`}
            >
              <BookOpen size={16} /> BATAILLE REINES
            </button>
            <button
              onClick={() => { setActiveTab('quiz'); playSynthSound('clink'); }}
              className={`flex-1 min-w-[120px] transition-all duration-200 py-3 px-4 rounded-xl font-serif italic text-sm flex items-center justify-center gap-2 ${
                activeTab === 'quiz' 
                  ? 'bg-[#5A5A40] text-white shadow-md' 
                  : 'bg-white/20 text-[#5A5A40] hover:bg-white/50'
              }`}
            >
              <Award size={16} /> SCUOLA ALPEGGIO
            </button>
          </div>

          {/* TAB 1: RADAR SENTIERI */}
          {activeTab === 'radar' && (
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#e5e5db] flex flex-col gap-6">
              
              {/* Trail selector dropdown */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#f5f5f0] pb-4">
                <div>
                  <label className="text-xs uppercase text-[#8a8a7c] font-bold tracking-widest block mb-1">Seleziona Sentiero della Valle d'Aosta</label>
                  <select
                    className="bg-[#f5f5f0] border border-[#d6d6cc] rounded-xl px-3 py-2 text-sm font-serif italic font-bold focus:outline-none focus:ring-2 focus:ring-[#5A5A40]"
                    value={selectedTrail.id}
                    onChange={(e) => {
                      const t = VALDOSTANO_TRAILS.find(tr => tr.id === e.target.value);
                      if (t) {
                        setSelectedTrail(t);
                        setRandomEncounterSpotted(null);
                        playSynthSound('success');
                      }
                    }}
                  >
                    {VALDOSTANO_TRAILS.map((trail) => (
                      <option key={trail.id} value={trail.id}>
                        {trail.name} ({trail.difficulty})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4">
                  <div className="bg-[#faedcd] py-1.5 px-3 rounded-lg text-xs font-bold text-[#8a5a00]">
                    Difficoltà: {selectedTrail.difficulty}
                  </div>
                  <div className="bg-[#e9edc9] py-1.5 px-3 rounded-lg text-xs font-bold text-[#5a6a20]">
                    Dislivello: +{selectedTrail.altitudeGain}m
                  </div>
                </div>
              </div>

              {/* Actual Open Source Hiking Trails Map */}
              <OpenSourceTrailMap
                selectedTrail={selectedTrail}
                distanceWalked={distanceWalked}
                randomEncounterSpotted={randomEncounterSpotted}
                onCaptureEncounter={handleCaptureEncounter}
              />

              {/* Simulation walking triggers */}
              <div className="flex flex-col md:flex-row items-center gap-4 bg-[#f5f5f0] p-4 rounded-2xl border border-stone-200">
                <div className="flex-1 text-center md:text-left">
                  <h4 className="font-serif italic font-bold text-[#5A5A40] text-base">Rilevatore di Movimento Sanitario</h4>
                  <p className="text-xs text-stone-600 mt-1">
                    Accumula cammino per sbloccare nuovi avvistamenti di bovine storiche della Valle d'Aosta!
                  </p>
                  {walkMessage && (
                    <div className="mt-2 text-xs font-mono font-bold text-[#d4a373] animate-pulse">
                      🌱 {walkMessage}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSimulateWalk}
                  disabled={isWalking}
                  className={`w-full md:w-auto h-14 px-8 rounded-xl font-serif italic text-lg shadow-md transition-all duration-200 flex items-center justify-center gap-2 ${
                    isWalking
                      ? 'bg-stone-400 text-stone-200 cursor-not-allowed animate-pulse'
                      : 'bg-[#d4a373] hover:bg-[#c29262] text-white'
                  }`}
                >
                  {isWalking ? '👣 CAMMINANDO...' : '🥾 CAMMINA 100M (SIMULA)'}
                </button>
              </div>

              {/* Responsible tips list */}
              <div>
                <h4 className="font-serif italic text-[#5A5A40] text-lg font-bold pb-2 border-b border-stone-200 flex items-center gap-2">
                  <ShieldAlert size={18} className="text-[#d4a373]" /> Decalogo del Buon Guardiaparco Responsabile
                </h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  {selectedTrail.responsibleTips.map((tip, idx) => (
                    <li key={idx} className="bg-[#f5f5f0] p-3 rounded-xl border-l-4 border-[#5A5A40] text-xs text-stone-700 font-medium">
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: CAMERA/SCANNER IA */}
          {activeTab === 'camera' && (
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#e5e5db] flex flex-col gap-6">
              
              <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                <div>
                  <h3 className="font-serif italic font-bold text-2xl text-[#5A5A40]">Identificatore di Razze Bovine</h3>
                  <p className="text-xs text-stone-600 mt-1">
                    Usa l'IA di Google Gemini per determinare la razza bovina del pascolo, sbloccare i dati educativi storici e calcolare le statistiche per Bataille de Reines.
                  </p>
                </div>

                {/* API Key warnings and options */}
                <div className="text-right flex flex-col items-end">
                  <span className="text-[10px] uppercase font-mono font-bold text-[#8a8a7c] bg-stone-100 px-2 py-1 rounded-full border border-stone-300">
                    Modello: Gemini 3.5 Flash
                  </span>
                  <p className="text-[10px] text-stone-500 mt-1 italic">
                    Istantanea in tempo reale
                  </p>
                </div>
              </div>

              {/* Main Camera view simulation or snapshot */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Visual view window */}
                <div className="md:col-span-7 flex flex-col gap-3">
                  <div className="bg-[#2d2d2a] rounded-2xl relative h-72 border-4 border-[#5A5A40] overflow-hidden flex items-center justify-center text-white">
                    
                    {/* Live video streaming */}
                    {hasCameraPermission ? (
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className="w-full h-full object-cover"
                      />
                    ) : customFileBase64 ? (
                      <img 
                        src={customFileBase64} 
                        className="w-full h-full object-cover" 
                        alt="Foto da caricare" 
                      />
                    ) : (
                      <div className="text-center p-6 flex flex-col items-center gap-3">
                        <span className="text-5xl animate-bounce">📸</span>
                        <p className="text-sm font-semibold max-w-[280px]">
                          La camera non è attiva. Mostra un'immagine campione qui a lato o carica un file per provare il classificatore d'alpeggio!
                        </p>
                        <button
                          onClick={handleStartCamera}
                          className="bg-[#d4a373] text-xs font-serif font-bold italic py-2 px-4 rounded-xl hover:bg-[#c29262] transition-colors"
                        >
                          Attiva Camera del Dispositivo
                        </button>
                      </div>
                    )}

                    {/* Laser scanning overlay line during processing */}
                    {isScanning && (
                      <div className="absolute inset-x-0 h-1.5 bg-[#d4a373] shadow-[0_0_15px_#d4a373] animate-bounce z-10"></div>
                    )}

                    {/* Live Scanner coordinates UI decor */}
                    <div className="absolute top-3 left-3 flex gap-1 items-center bg-[#2d2d2a]/70 px-2 py-0.5 rounded text-[9px] font-mono tracking-widest text-[#e2e2d9]">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span> GPS CORG-3A
                    </div>
                    <div className="absolute bottom-3 right-3 text-[10px] font-mono text-stone-300 bg-black/50 px-2 rounded">
                      REG: VDA-PASCOLO
                    </div>
                  </div>

                  {/* Actions under camera */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleScanBovine}
                      disabled={isScanning}
                      className={`flex-1 h-14 rounded-xl font-serif italic text-lg shadow-md flex items-center justify-center gap-3 transition-colors ${
                        isScanning
                          ? 'bg-stone-400 text-stone-250 cursor-not-allowed animate-pulse'
                          : 'bg-[#d4a373] hover:bg-[#c29262] text-white font-extrabold'
                      }`}
                    >
                      {isScanning ? (
                        <>🗜️ ANALISI MULTIMODALE GEMINI IN CORSO...</>
                      ) : (
                        <>📷 SCATTA E ANALIZZA CON L'IA</>
                      )}
                    </button>

                    {/* Uploader fallback */}
                    <label className="bg-white border border-[#d6d6cc] hover:bg-stone-50 text-stone-700 rounded-xl px-4 py-3 flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm text-sm">
                      <Plus size={16} /> Carica Foto Mucca
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                      />
                    </label>

                    {customFileBase64 && (
                      <button
                        onClick={() => { setCustomFileBase64(null); playSynthSound('clink'); }}
                        className="text-red-500 text-xs flex items-center gap-1 hover:underline"
                      >
                        <X size={14} /> Rimuovi foto
                      </button>
                    )}
                  </div>
                </div>

                {/* Showcase of preloaded samples / Demo cows on the Right of camera */}
                <div className="md:col-span-5 flex flex-col gap-4">
                  <div className="bg-[#f5f5f0] p-4 rounded-2xl border border-stone-200">
                    <h4 className="font-serif italic font-bold text-[#5A5A40] text-sm mb-2 flex items-center gap-1.5">
                      <Sparkles size={16} className="text-[#d4a373]" /> Simulatore Demo Alpeggio
                    </h4>
                    <p className="text-[11px] text-stone-600 mb-4 font-medium">
                      Non hai mucche sotto mano? Seleziona una di queste Reines della Valle d'Aosta per testare la classificazione artificiale:
                    </p>

                    <div className="flex flex-col gap-2">
                      {DEMO_COWS.map((demo) => {
                        const isSelected = selectedDemoCow === demo.id && !customFileBase64;
                        return (
                          <button
                            key={demo.id}
                            onClick={() => {
                              setSelectedDemoCow(demo.id);
                              setCustomFileBase64(null);
                              setScannedCowResult(null);
                              playSynthSound('clink');
                              stopCameraStream();
                            }}
                            className={`w-full text-left p-2 rounded-xl flex items-center justify-between border transition-all ${
                              isSelected
                                ? 'bg-white border-2 border-[#5A5A40] shadow-sm'
                                : 'bg-white/40 border-stone-200 hover:bg-white/90'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{demo.iconEmoji}</span>
                              <div>
                                <div className="text-xs font-bold text-stone-800">{demo.displayName}</div>
                                <div className="text-[9px] text-[#8a8a7c] italic">Origine: {demo.pasture}</div>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono bg-stone-100 rounded-full py-0.5 px-2">
                              {demo.breed.split(' ')[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Scanning results printout */}
              {scannedCowResult && (
                <div className="bg-[#fefae0] rounded-2xl p-5 border-2 border-[#faedcd] shadow-inner mt-4 animate-fade-in">
                  
                  {/* Cow Is NOT a cow case */}
                  {!scannedCowResult.isCow ? (
                    <div className="flex items-start gap-4 p-2">
                      <ShieldAlert size={32} className="text-red-500 scale-125" />
                      <div>
                        <h4 className="font-serif italic font-extrabold text-xl text-red-700">Analisi Fallita: Errore d'Inquadramento Bovina</h4>
                        <p className="text-sm text-stone-700 mt-2">
                          L'IA di Gemini ha analizzato l'immagine ma non ha riscontrato alcun bovino al pascolo. 
                        </p>
                        <p className="text-xs text-stone-500 mt-1 italic">
                          Suggerimento educativo: Evita di fotografare insetti ravvicinati, rocce sagomate o i vostri panini di viaggio! Per sbloccare la Vazzadex devi focalizzarti su una vera mucca d'alpeggio.
                        </p>
                      </div>
                    </div>
                  ) : (
                    
                    /* Cow Identified output */
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2 border-b border-[#faedcd] pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="bg-[#faedcd] hover:animate-spin text-xs px-2.5 py-1 rounded-full text-[#8a5a00] font-extrabold uppercase tracking-widest leading-none">
                              {scannedCowResult.rarity}
                            </span>
                            <span className="text-xs text-[#8a8a7c] uppercase tracking-widest font-mono">
                              Nuova Specie Sbloccata!
                            </span>
                          </div>
                          
                          <h4 className="font-serif italic font-black text-2xl text-[#5A5A40] mt-1.5 flex items-center gap-2">
                            🐮 {scannedCowResult.suggestedName} 
                            <span className="text-sm font-sans not-italic text-stone-500 font-medium">({scannedCowResult.breed})</span>
                          </h4>
                          <p className="text-xs text-[#8a8a7c] italic mt-1">
                            Foto scattata a: <span className="font-bold">{selectedTrail.name}</span>
                          </p>
                        </div>

                        {/* Weight and milk badges */}
                        <div className="flex gap-2">
                          <div className="bg-white/80 py-2 px-3 rounded-lg border border-stone-200 text-center min-w-[80px]">
                            <span className="block text-[8px] uppercase text-[#8a8a7c]">Stima Peso</span>
                            <span className="font-serif font-bold text-sm text-[stone-800]">{scannedCowResult.weight} kg</span>
                          </div>
                          <div className="bg-white/80 py-2 px-3 rounded-lg border border-stone-200 text-center min-w-[80px]">
                            <span className="block text-[8px] uppercase text-[#8a8a7c]">Latte/Giorno</span>
                            <span className="font-serif font-bold text-sm text-[stone-800]">{scannedCowResult.milkProduction} litri</span>
                          </div>
                        </div>
                      </div>

                      {/* Decriptive details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs uppercase text-[#8a8a7c] font-bold block mb-1">Storia e Caratteristiche Culturali</span>
                          <p className="text-xs text-stone-700 leading-relaxed font-serif">
                            {scannedCowResult.description}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs uppercase text-[#8a8a7c] font-bold block mb-1">Aneddoto Curioso</span>
                          <p className="text-xs text-stone-700 leading-relaxed italic bg-white/40 p-3 rounded-xl border border-white/80">
                            " {scannedCowResult.funFact} "
                          </p>
                        </div>
                      </div>

                      {/* Distance evaluation review */}
                      <div className="bg-[#e9edc9] p-3.5 rounded-xl border-l-4 border-[#5A5A40] flex items-start gap-2">
                        <CheckCircle size={16} className="text-[#5A5A40] mt-0.5 shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-[#5A5A40] block mb-0.5">Valutazione Sicurezza & Rispetto del Pascolo:</span>
                          <p className="text-xs text-stone-800 italic">
                            {scannedCowResult.safeDistanceEvaluation}
                          </p>
                        </div>
                      </div>

                      {/* Combat stats assigned */}
                      <div>
                        <span className="text-xs uppercase text-[#8a8a7c] font-bold block mb-2">Attitudini e Statistiche di "Bataille de Reines":</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-white/70 p-2.5 rounded-xl border border-stone-200">
                            <span className="text-[10px] text-stone-500 uppercase block">Forza Spinta</span>
                            <span className="font-serif font-bold text-base text-stone-800">{scannedCowResult.combatStats?.strength} / 95</span>
                            <div className="w-full bg-stone-200 h-1 rounded mt-1.5">
                              <div className="bg-red-400 h-full rounded" style={{ width: `${(scannedCowResult.combatStats?.strength / 95) * 100}%` }}></div>
                            </div>
                          </div>

                          <div className="bg-white/70 p-2.5 rounded-xl border border-stone-200">
                            <span className="text-[10px] text-stone-500 uppercase block">Resistenza</span>
                            <span className="font-serif font-bold text-base text-stone-800">{scannedCowResult.combatStats?.resistance} / 95</span>
                            <div className="w-full bg-stone-200 h-1 rounded mt-1.5">
                              <div className="bg-blue-400 h-full rounded" style={{ width: `${(scannedCowResult.combatStats?.resistance / 95) * 100}%` }}></div>
                            </div>
                          </div>

                          <div className="bg-white/70 p-2.5 rounded-xl border border-stone-200">
                            <span className="text-[10px] text-stone-500 uppercase block">Agilità</span>
                            <span className="font-serif font-bold text-base text-stone-800">{scannedCowResult.combatStats?.agility} / 95</span>
                            <div className="w-full bg-stone-200 h-1 rounded mt-1.5">
                              <div className="bg-green-400 h-full rounded" style={{ width: `${(scannedCowResult.combatStats?.agility / 95) * 100}%` }}></div>
                            </div>
                          </div>

                          <div className="bg-white/70 p-2.5 rounded-xl border border-stone-200">
                            <span className="text-[10px] text-stone-500 uppercase block">Regalità (Spirito)</span>
                            <span className="font-serif font-bold text-base text-[#d4a373]">{scannedCowResult.combatStats?.spirit} / 95</span>
                            <div className="w-full bg-stone-200 h-1 rounded mt-1.5">
                              <div className="bg-[#d4a373] h-full rounded" style={{ width: `${(scannedCowResult.combatStats?.spirit / 95) * 100}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COLLEZIONE VAZZADEX */}
          {activeTab === 'vazzadex' && (
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#e5e5db] flex flex-col gap-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f5f5f0] pb-4">
                <div>
                  <h3 className="font-serif italic font-bold text-2xl text-[#5A5A40]">La Vazzadex & Registro Storico</h3>
                  <p className="text-xs text-stone-600 mt-1">
                    Esplora la collezione personale delle tue regine alpine o sfoglia il Registro Storico ufficiale della Valle d'Aosta.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-bold text-[#8a8a7c]">Biscotti d'Alpeggio disponibili:</span>
                  <span className="w-8 h-8 rounded-full bg-[#faedcd] border border-[#d4a373] font-bold text-sm flex items-center justify-center">
                    {pastureTreats}
                  </span>
                </div>
              </div>

              {/* Sub-tab selection indicator */}
              <div className="flex bg-[#f5f5f0] p-1 rounded-2xl self-start gap-1 border border-stone-200">
                <button
                  type="button"
                  onClick={() => { setVazzadexSubTab('my_cows'); playSynthSound('clink'); }}
                  className={`px-4 py-2 text-xs font-serif italic font-bold rounded-xl transition-all ${
                    vazzadexSubTab === 'my_cows'
                      ? 'bg-[#5A5A40] text-white shadow'
                      : 'text-[#5A5A40] hover:bg-stone-200/50'
                  }`}
                >
                  🍀 Il Mio Pascolo ({vazzadex.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setVazzadexSubTab('registry'); playSynthSound('clink'); }}
                  className={`px-4 py-2 text-xs font-serif italic font-bold rounded-xl transition-all ${
                    vazzadexSubTab === 'registry'
                      ? 'bg-[#5A5A40] text-white shadow'
                      : 'text-[#5A5A40] hover:bg-stone-200/50'
                  }`}
                >
                  📖 Albo Reines Storiche ({HISTORIC_BOVINES_DATABASE.length})
                </button>
              </div>

              {vazzadexSubTab === 'my_cows' ? (
                <div>
                  {vazzadex.length === 0 ? (
                    <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-300">
                      <span className="text-4xl block mb-2">🐄</span>
                      <h4 className="font-serif italic font-bold text-lg text-stone-700">Il tuo pascolo è vuoto!</h4>
                      <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                        Inquadra una mucca reale sui sentieri alpini con lo Scanner IA o recluta una delle regine storiche dal Registro nell'altra scheda!
                      </p>
                    </div>
                  ) : (
                    /* Grid of captured bovids */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {vazzadex.map((cow) => {
                        const isRenaming = renamingCowId === cow.id;
                        const isChampion = championId === cow.id;

                        return (
                          <div 
                            key={cow.id} 
                            className={`rounded-2xl p-4 border transition-all ${
                              isChampion ? 'bg-[#faedcd]/40 border-2 border-[#d4a373]' : 'bg-[#f5f5f0]/60 border-stone-250'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                {isRenaming ? (
                                  <div className="flex gap-1">
                                    <input
                                      type="text"
                                      value={newCowName}
                                      placeholder="Nuovo nome..."
                                      onChange={(e) => setNewCowName(e.target.value)}
                                      className="bg-white border rounded px-2 py-1 text-xs outline-none w-28"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRenameCow(cow.id)}
                                      className="bg-green-600 text-white text-xs px-2 rounded hover:bg-green-700"
                                    >
                                      Sì
                                    </button>
                                  </div>
                                ) : (
                                  <h4 className="font-serif font-black text-lg text-stone-800 flex items-center gap-1.5">
                                    {cow.name}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRenamingCowId(cow.id);
                                        setNewCowName(cow.name);
                                        playSynthSound('clink');
                                      }}
                                      className="text-[#8a8a7c]"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                  </h4>
                                )}
                                <span className="text-[10px] text-[#8a8a7c] font-medium block">
                                  {cow.breed} • <span className="italic">{cow.rarity}</span>
                                </span>
                              </div>

                              <span className="font-mono text-xs bg-white py-1 px-2.5 rounded-full border border-stone-200 font-bold">
                                LV. {cow.level}
                              </span>
                            </div>

                            <div className="flex gap-4">
                              <div className="w-20 h-20 bg-amber-100 rounded-xl border border-amber-250 overflow-hidden flex items-center justify-center text-3xl font-bold shadow-inner relative">
                                {/* Polaroid photo mock */}
                                {cow.customPhoto ? (
                                  <img src={cow.customPhoto} className="w-full h-full object-cover" alt="Mucca" />
                                ) : (
                                  <span>🐄</span>
                                )}
                              </div>

                              <div className="flex-1">
                                {/* Compact Combat Stats list */}
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                                  <div>Forza: <span className="font-bold">{cow.combatStats.strength}</span></div>
                                  <div>Resistenza: <span className="font-bold">{cow.combatStats.resistance}</span></div>
                                  <div>Agilità: <span className="font-bold">{cow.combatStats.agility}</span></div>
                                  <div>Spirito: <span className="font-bold text-[#d4a373]">{cow.combatStats.spirit}</span></div>
                                </div>

                                <div className="flex flex-wrap gap-2 mt-[12px]">
                                  {/* Set Champion Button */}
                                  <button
                                    type="button"
                                    onClick={() => { setChampionId(cow.id); playSynthSound('success'); }}
                                    className={`py-1 px-2.5 rounded text-[10px] font-bold ${
                                      isChampion
                                        ? 'bg-[#d4a373] text-white shadow-sm'
                                        : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-250'
                                    }`}
                                  >
                                    {isChampion ? '👑 CAMPIONESSA ATTIVA' : 'Scegli per Bataille'}
                                  </button>

                                  {/* Feed treat */}
                                  <button
                                    type="button"
                                    onClick={() => handleFeedTreast(cow.id)}
                                    disabled={pastureTreats <= 0}
                                    className={`py-1 px-2 text-[10px] rounded font-semibold transition-colors ${
                                      pastureTreats > 0
                                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 cursor-pointer'
                                        : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                    }`}
                                    title="Nutri la mucca con un biscotto d'alpeggio per farla salire di livello"
                                  >
                                    🍪 Nutri (+1 Lvl)
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-stone-200 text-[11px] text-stone-600">
                              <p className="line-clamp-2">{cow.funFact || cow.description}</p>
                              {cow.capturedLocation && (
                                <p className="text-[9px] text-[#8a8a7c] mt-1 font-mono uppercase">Avvistata in: {cow.capturedLocation} il {cow.capturedAt}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* OFFICIAL REGISTRY OF THE 61 HISTORIC COW QUEENS */
                <div className="flex flex-col gap-4">
                  <div className="bg-[#f0f0e8]/80 p-4 rounded-2xl border border-[#e2e2d5] flex flex-col gap-3">
                    <p className="text-xs text-stone-700 leading-relaxed">
                      L'archivio digitalizzato dell'<strong>Association régionale des Amis des Batailles de Reines</strong> raccoglie i dati delle campionesse alpine registrate nei tornei del Patois valdostano. Puoi filtrare l'archivio e reclutare qualsiasi regina storica nel tuo pascolo amichevole per vederla combattere!
                    </p>

                    {/* Filter and search bar controls */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      {/* Search Bar Input */}
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-stone-400">
                          <Search size={14} />
                        </span>
                        <input
                          type="text"
                          placeholder="Cerca Reine, proprietario, comune..."
                          value={registrySearchQuery}
                          onChange={(e) => setRegistrySearchQuery(e.target.value)}
                          className="w-full bg-white border border-stone-250 rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-[#5A5A40] text-stone-800 placeholder-stone-500 font-sans"
                        />
                      </div>

                      {/* Weight Category Filter */}
                      <div className="relative">
                        <select
                          value={registryCategoryFilter}
                          onChange={(e) => setRegistryCategoryFilter(e.target.value as any)}
                          className="w-full bg-white border border-stone-250 rounded-xl px-2.5 py-1.5 text-xs text-[#5A5A40] outline-none font-sans appearance-none"
                        >
                          <option value="All">Seleziona Categoria Peso (Tutte)</option>
                          <option value="1ª Categoria">👑 1ª Categoria (Massimi ≥ 700 kg)</option>
                          <option value="2ª Categoria">🐂 2ª Categoria (Intermedio 600-700 kg)</option>
                          <option value="3ª Categoria">⚡ 3ª Categoria (Leggeri &lt; 600 kg)</option>
                        </select>
                      </div>

                      {/* Breed Filter */}
                      <div>
                        <select
                          value={registryBreedFilter}
                          onChange={(e) => setRegistryBreedFilter(e.target.value as any)}
                          className="w-full bg-white border border-stone-250 rounded-xl px-2.5 py-1.5 text-xs text-[#5A5A40] outline-none font-sans appearance-none"
                        >
                          <option value="All">Seleziona Razza (Tutte)</option>
                          <option value="Castana Valdostana">Castana / Châtaine (Regina Combattente)</option>
                          <option value="Pezzata Nera Valdostana">Pie Noire (Combattiva e Agile)</option>
                          <option value="Pezzata Rossa Valdostana">Pie Rouge (Pacifica da latte)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Render the matching database list */}
                  {(() => {
                    const q = registrySearchQuery.toLowerCase().trim();
                    const filteredRegistry = HISTORIC_BOVINES_DATABASE.filter((cow) => {
                      const matchSearch = !q ||
                        cow.name.toLowerCase().includes(q) ||
                        cow.owner.toLowerCase().includes(q) ||
                        cow.comune.toLowerCase().includes(q) ||
                        cow.id.toLowerCase().includes(q);

                      const matchCategory = registryCategoryFilter === 'All' || cow.category === registryCategoryFilter;
                      const matchBreed = registryBreedFilter === 'All' || cow.breed === registryBreedFilter;

                      return matchSearch && matchCategory && matchBreed;
                    });

                    if (filteredRegistry.length === 0) {
                      return (
                        <div className="text-center py-10 bg-white border border-dashed border-stone-250 rounded-2xl">
                          <span className="text-3xl block">🔍</span>
                          <p className="text-xs text-stone-500 mt-2">Nessuna regina corrisponde ai criteri inseriti.</p>
                          <button
                            type="button"
                            onClick={() => { setRegistrySearchQuery(''); setRegistryCategoryFilter('All'); setRegistryBreedFilter('All'); }}
                            className="mt-3 text-xs text-[#5A5A40] font-sans font-bold underline"
                          >
                            Resetta i filtri di ricerca
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredRegistry.map((cow) => {
                          const isAlreadyCow = vazzadex.some(
                            c => c.name.toLowerCase() === cow.name.toLowerCase() && c.breed === cow.breed
                          );

                          // Aesthetic style for vaccine cards based on breed
                          let cardBg = 'bg-[#faf8f5] border-amber-250/50';
                          let breedBadgeBg = 'bg-stone-100 text-stone-700';
                          if (cow.breed === 'Castana Valdostana') {
                            cardBg = 'bg-[#f4efe8]/80 border-amber-300/40';
                            breedBadgeBg = 'bg-[#b38a6a] text-white';
                          } else if (cow.breed === 'Pezzata Nera Valdostana') {
                            cardBg = 'bg-slate-50 border-slate-200';
                            breedBadgeBg = 'bg-stone-800 text-stone-100';
                          } else if (cow.breed === 'Pezzata Rossa Valdostana') {
                            cardBg = 'bg-orange-50/50 border-orange-200';
                            breedBadgeBg = 'bg-[#d4a373] text-white';
                          }

                          return (
                            <div 
                              key={cow.id} 
                              className={`rounded-2xl border transition-all hover:shadow-md flex flex-col justify-between overflow-hidden ${cardBg}`}
                            >
                              <div>
                                {cow.imagePath && (
                                  <div className="w-full h-44 relative bg-stone-100 overflow-hidden border-b border-stone-200">
                                    <img 
                                      src={cow.imagePath} 
                                      alt={cow.name} 
                                      className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                                      referrerPolicy="no-referrer"
                                    />
                                    {cow.specialAward && (
                                      <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-[8px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full shadow-lg border border-amber-300">
                                        ✨ {cow.specialAward}
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className="p-4">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="text-[9px] font-mono font-bold tracking-widest text-[#8a8a7c] block">
                                        REGISTRO #{cow.id}
                                      </span>
                                      <h4 className="font-serif font-black text-xl text-[#3d3d2a] tracking-tight uppercase flex items-center gap-1.5 mt-0.5">
                                        {cow.name}
                                      </h4>
                                      <span className={`inline-block text-[8px] font-bold uppercase rounded px-1.5 py-0.5 mt-1 ${breedBadgeBg}`}>
                                        {cow.breed}
                                      </span>
                                    </div>

                                    <div className="flex flex-col items-end gap-1.5">
                                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                        cow.rarity === 'Leggendaria' ? 'bg-amber-100 text-[#8a5a00] border border-amber-300' :
                                        cow.rarity === 'Epica' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                        cow.rarity === 'Rara' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                        'bg-stone-100 text-stone-600 border border-stone-200'
                                      }`}>
                                        {cow.rarity}
                                      </span>
                                      <span className="text-[10px] font-mono font-bold text-stone-600">
                                        ⚖️ {cow.weight} kg • {cow.category}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-2.5 space-y-1 bg-white/70 p-2.5 rounded-lg border border-stone-200/50">
                                    <div className="text-[10px] text-stone-600 flex items-center gap-1">
                                      <span>👤 Allevatore:</span> 
                                      <span className="font-bold text-stone-800">{cow.owner}</span>
                                    </div>
                                    <div className="text-[10px] text-stone-600 flex items-center gap-1">
                                      <span>📍 Comune:</span> 
                                      <span className="font-bold text-stone-800">{cow.comune}</span>
                                    </div>
                                    <div className="text-[10px] text-stone-600 flex items-center gap-1">
                                      <span>🏆 Albo Nazionale:</span> 
                                      <span className="font-bold text-[#8a5a00] italic">{cow.recognition}</span>
                                    </div>
                                    {cow.specialAward && (
                                      <div className="text-[9px] bg-amber-100/60 p-1 rounded border border-amber-200 text-amber-800 font-sans font-semibold inline-block mt-1">
                                        🥇 Premio Speciale: {cow.specialAward}
                                      </div>
                                    )}
                                  </div>

                                  <div className="mt-3">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-[10px] uppercase font-bold text-stone-500">Statistiche d'Arena</span>
                                      <div className="flex gap-2">
                                        <span className="text-[8px] uppercase font-mono px-1.5 bg-red-50 text-red-700 border border-red-200 rounded font-bold">Attacco: {cow.attack}</span>
                                        <span className="text-[8px] uppercase font-mono px-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-bold">Difesa: {cow.defense}</span>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1.5 text-[8px] bg-white/40 p-1.5 rounded border border-stone-200/40">
                                      <div>Forza: <span className="font-bold">{cow.combatStats.strength}</span></div>
                                      <div>Stamina: <span className="font-bold">{cow.combatStats.resistance}</span></div>
                                      <div>Agilità: <span className="font-bold">{cow.combatStats.agility}</span></div>
                                      <div>Spirito: <span className="font-bold">{cow.combatStats.spirit}</span></div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="p-4 pt-0">
                                <div className="pt-3.5 border-t border-stone-200 flex items-center justify-between">
                                  <p className="text-[10px] text-stone-500 italic max-w-[210px] line-clamp-2 leading-tight">
                                    {cow.note}
                                  </p>
                                  {isAlreadyCow ? (
                                    <span className="text-[9px] font-bold text-green-700 flex items-center gap-1 whitespace-nowrap bg-green-50 px-2 py-1 rounded border border-green-200">
                                      <CheckCircle size={10} /> RECLUTATA
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleAdoptHistoricCow(cow)}
                                      className="bg-[#5A5A40] hover:bg-[#43432f] text-white text-[9px] font-bold py-1.5 px-3 rounded-lg transition-colors shadow-sm whitespace-nowrap"
                                    >
                                      ➕ RECLUTA IN SQUADRA
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BATAILLE DE REINES MINI-GAME */}
          {activeTab === 'bataille' && (
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#e5e5db] flex flex-col gap-6">
              
              <div className="border-b border-[#f5f5f0] pb-4">
                <h3 className="font-serif italic font-bold text-2xl text-[#5A5A40] flex items-center gap-2">
                  👑 Bataille de Reines <span className="text-xs font-sans not-italic text-stone-500 font-bold">(Torneo Amichevole d'Arena)</span>
                </h3>
                <p className="text-xs text-stone-600 mt-1">
                  Sfida i pastori storici della Valle d'Aosta. Clicca con il ritmo giusto per spingere l'avversaria fuori pista e vincere XP ed encomi montani!
                </p>
              </div>

              {battleState === 'idle' ? (
                /* Select opponent state */
                <div className="flex flex-col gap-4">
                  <h4 className="font-serif italic text-[#5A5A40] text-lg font-bold">1. Seleziona Alpeggiatore Avversario</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {NPC_OPPONENTS.map((npc) => (
                      <button
                        key={npc.id}
                        onClick={() => { setSelectedOpponentId(npc.id); playSynthSound('clink'); }}
                        className={`p-4 rounded-2xl text-left border flex flex-col justify-between transition-all ${
                          selectedOpponentId === npc.id
                            ? 'bg-[#faedcd]/40 border-2 border-[#d4a373] shadow-md'
                            : 'bg-[#f5f5f0]/50 hover:bg-[#f5f5f0] border-stone-200'
                        }`}
                      >
                        <div>
                          <span className="text-4xl">{npc.avatar}</span>
                          <h5 className="font-serif font-black text-base text-stone-850 mt-2">{npc.name}</h5>
                          <p className="text-[10px] text-[#8a8a7c] uppercase font-bold">{npc.title}</p>
                          <p className="text-xs text-stone-600 mt-3 italic line-clamp-3">"{npc.dialogueIntro}"</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-stone-200 w-full flex items-center justify-between text-xs font-serif font-bold">
                          <span>Reina: <span className="text-[#5A5A40]">"{npc.cowName}"</span></span>
                          <span className="bg-[#5A5A40] text-white py-0.5 px-2 rounded-full text-[10px]">Lv.{npc.cowLevel}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Pick user fighter */}
                  <div className="bg-[#f5f5f0] p-4 rounded-xl border border-stone-200 mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">👑🐮</span>
                      <div>
                        <h4 className="font-serif italic font-bold">Campionessa Combattiva per la Tua Scuderia:</h4>
                        <p className="text-xs text-stone-600 font-mono">
                          {activeChampion.name} (Razza: {activeChampion.breed} • Livello {activeChampion.level})
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setActiveTab('vazzadex'); playSynthSound('clink'); }}
                      className="text-xs bg-white text-[#5A5A40] hover:bg-stone-50 border border-stone-300 font-serif font-bold italic py-2 px-3 rounded-xl shadow-sm"
                    >
                      Scegli Altra mucca
                    </button>
                  </div>

                  <button
                    onClick={handleStartBattle}
                    className="h-16 bg-[#d4a373] hover:bg-[#c29262] text-white text-xl font-serif font-extrabold italic rounded-2xl shadow-lg mt-4 flex items-center justify-center gap-2"
                  >
                    👑 LANCIA IL GUANTO DI SFIDA
                  </button>
                </div>
              ) : battleState === 'intro' ? (
                /* Dialogue intro screen */
                <div className="bg-[#f5f5f0] rounded-2xl p-6 text-center flex flex-col items-center gap-4">
                  <div className="flex gap-4">
                    <span className="text-6xl">{activeOpponent.avatar}</span>
                    <span className="text-5xl border-2 border-[#5A5A40] bg-white rounded-full p-2 flex items-center justify-center">🤝</span>
                    <span className="text-6xl">🐮</span>
                  </div>
                  
                  <div className="max-w-[500px]">
                    <h4 className="font-serif italic text-lg font-bold text-[#5A5A40]">{activeOpponent.name} dixe:</h4>
                    <p className="font-serif italic text-base text-stone-700 mt-2">
                      "{activeOpponent.dialogueIntro}"
                    </p>
                  </div>

                  <button
                    onClick={handleStartSimulatedCombatAction}
                    className="bg-[#5A5A40] text-white hover:bg-[#4a4a34] font-serif font-bold py-3 px-8 rounded-xl text-lg mt-4 shadow"
                  >
                    Saluta ed entra in Arena 🥾
                  </button>
                </div>
              ) : (
                /* Active Battle Arena */
                <div className="flex flex-col gap-6">
                  
                  <div className="flex justify-between items-center bg-[#f5f5f0] p-4 rounded-xl border border-stone-200">
                    {/* User side */}
                    <div className="flex items-center gap-3 w-1/3">
                      <span className="text-4xl">🐮</span>
                      <div>
                        <div className="text-xs font-bold font-serif">{activeChampion.name}</div>
                        <div className="text-[10px] text-stone-500 font-medium">{activeChampion.breed}</div>
                        <div className="text-xs font-bold text-[#d4a373]">Livello {activeChampion.level}</div>
                      </div>
                    </div>

                    <div className="text-center font-bold text-[#5A5A40] uppercase tracking-wider text-xs">
                      VS amichevole
                    </div>

                    {/* NPC side */}
                    <div className="flex items-center gap-3 w-1/3 justify-end text-right">
                      <div>
                        <div className="text-xs font-bold font-serif">{activeOpponent.cowName}</div>
                        <div className="text-[10px] text-stone-500 font-medium">{activeOpponent.cowBreed}</div>
                        <div className="text-xs font-bold text-[#5A5A40]">Livello {activeOpponent.cowLevel}</div>
                      </div>
                      <span className="text-4xl">🐃</span>
                    </div>
                  </div>

                  {/* Battle graphical playground (Tug of war) */}
                  <div className="h-44 bg-gradient-to-b from-emerald-100 to-emerald-200 rounded-2xl relative border-2 border-stone-200 overflow-hidden flex items-center justify-center">
                    
                    {/* Arena dust cloud decor */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#d4a373 2px, transparent 2px)', backgroundSize: '15px 15px' }}></div>
                    
                    {/* Arena markings */}
                    <div className="absolute inset-y-0 left-10 w-1 bg-red-400 opacity-60"></div>
                    <div className="absolute inset-y-0 right-10 w-1 bg-red-400 opacity-60"></div>
                    <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white opacity-80 border-dashed"></div>

                    {/* Left cow (user) */}
                    <div 
                      className="absolute transition-all duration-300 transform scale-x-[-1] text-6xl select-none"
                      style={{ left: `${(100 - pullProgress) * 0.7 + 5}%` }}
                    >
                      🐄
                    </div>

                    {/* Right cow (oppponent) */}
                    <div 
                      className="absolute transition-all duration-300 text-6xl select-none"
                      style={{ right: `${pullProgress * 0.7 + 5}%` }}
                    >
                      🐃
                    </div>

                    {/* Locking horns visual explosion or dust */}
                    <div 
                      className="absolute left-[calc(100%-progress-2%)] transform -translate-x-1/2 text-2xl select-none animate-ping text-[#d4a373]"
                      style={{ left: `${100 - pullProgress}%` }}
                    >
                      💥
                    </div>
                  </div>

                  {/* Head-to-head center metric */}
                  <div className="flex flex-col gap-1 items-center">
                    <span className="text-xs uppercase text-stone-500 font-bold tracking-wider">Baricentro di Spinta d'Alpeggio</span>
                    <div className="w-full h-4 bg-stone-200 rounded-full overflow-hidden relative border border-stone-300">
                      
                      {/* Anchor marker */}
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 via-[#d4a373] to-red-500 transition-all duration-300"
                        style={{ width: `${100 - pullProgress}%` }}
                      ></div>
                      
                      {/* Safety limit markers */}
                      <div className="absolute top-0 bottom-0 left-10 w-0.5 bg-red-800"></div>
                      <div className="absolute top-0 bottom-0 right-10 w-0.5 bg-red-800"></div>
                    </div>
                    <div className="flex justify-between w-full text-[10px] text-stone-500 font-mono mt-1">
                      <span>La tua Regina Spinge</span>
                      <span>Gerarchia in Equilibrio</span>
                      <span>Regina Oppositrice Spinge</span>
                    </div>
                  </div>

                  {/* Rhythm Slinder component for pushing triggers */}
                  {battleState === 'active' ? (
                    <div className="bg-[#f5f5f0] p-4 rounded-xl border border-stone-200 flex flex-col items-center gap-3">
                      <span className="text-xs font-bold text-stone-600 block uppercase">Calibra la Spinta della Tua Regina al Centro Verde</span>
                      
                      <div className="w-full h-8 bg-gradient-to-r from-red-400 via-green-400 to-red-400 rounded-xl relative border border-stone-300 shadow-inner flex items-center justify-center">
                        {/* Perfect Green zone border */}
                        <div className="absolute inset-y-0 w-[20%] bg-emerald-500 rounded border-x-2 border-white opacity-90 leading-none"></div>
                        
                        {/* Needle/Marker */}
                        <div 
                          className="absolute w-2 h-10 bg-black border-2 border-white rounded shadow-md transform -translate-x-1/2 transition-all duration-75"
                          style={{ left: `${sliderPosition}%` }}
                        ></div>
                      </div>

                      <button
                        onClick={handlePushCombatTrigger}
                        className="w-full h-16 bg-[#d4a373] hover:bg-[#c29262] text-white rounded-xl italic font-serif font-black text-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                      >
                        🔔 SPINGI CON REGALITÀ ORA!
                      </button>
                    </div>
                  ) : null}

                  {/* Battle conclusion layout options */}
                  {battleState === 'win' || battleState === 'loss' ? (
                    <div className={`p-6 rounded-2xl text-center flex flex-col items-center gap-4 border-2 ${
                      battleState === 'win' ? 'bg-[#e9edc9] border-[#5A5A40] text-emerald-800' : 'bg-[#faedcd] border-[#d4a373] text-[#8a5a00]'
                    }`}>
                      <span className="text-5xl">{battleState === 'win' ? '👑🏆🎉' : '🔔🤝🌱'}</span>
                      <h4 className="font-serif font-extrabold text-xl">
                        {battleState === 'win' ? 'Vittoria della tua Bovila!' : 'Incontro Concluso con Onore!'}
                      </h4>
                      <p className="text-xs text-stone-700 max-w-[450px]">
                        {battleState === 'win' ? activeOpponent.dialogueWin : activeOpponent.dialogueLoss}
                      </p>
                      <p className="text-[11px] text-stone-500 font-medium">
                        {battleState === 'win' 
                          ? `Premi guadagnati: +${activeOpponent.rewardXp} XP, +1 Biscotto d'Alpeggio, e la tua mucca sale di livello!` 
                          : 'Le Reines salutano e riprendono a brucare il fieno. Nessun rancore: si ritorna ad allenarsi!'}
                      </p>

                      <button
                        onClick={() => { setBattleState('idle'); playSynthSound('clink'); }}
                        className="bg-[#5A5A40] text-white font-serif italic py-2 px-6 rounded-lg text-sm hover:bg-[#4a4a34]"
                      >
                        Torna all'Elenco Sfide d'Arena
                      </button>
                    </div>
                  ) : null}

                  {/* Battle Ticker logs */}
                  <div className="bg-[#2d2d2a] text-[#e2e2d9] rounded-2xl p-4 font-mono text-[11px] h-36 overflow-y-auto flex flex-col gap-1 shadow-inner">
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest block font-bold border-b border-stone-700 pb-1.5 mb-1">
                      Cronaca del Combattimento d'Arena:
                    </span>
                    {battleLog.map((log, idx) => (
                      <div key={idx} className={`${idx === 0 ? 'text-[#e9edc9] font-bold' : 'text-stone-400'}`}>
                        &gt; {log}
                      </div>
                    ))}
                  </div>

                </div>
              )}
            </div>
          )}

          {/* TAB 5: SCUOLA D'ALPEGGIO QUIZ */}
          {activeTab === 'quiz' && (
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#e5e5db] flex flex-col gap-6">
              
              <div className="border-b border-[#f5f5f0] pb-4">
                <h3 className="font-serif italic font-bold text-2xl text-[#5A5A40] flex items-center gap-2">
                  🧀 Scuola d'Alpeggio & Caseificazione
                </h3>
                <p className="text-xs text-stone-600 mt-1">
                  Impara le tradizioni della pastorizia e le regole ambientali. Rispondi correttamente alle domande dei guardiaparco per vincere preziosi Biscotti d'Alpeggio!
                </p>
              </div>

              {quizQuestions.length > 0 && !quizCompleted ? (
                /* Active Quiz */
                <div>
                  <div className="flex justify-between items-center text-xs font-mono text-stone-500 mb-4 bg-[#f5f5f0] p-2 rounded-lg">
                    <span>Domanda {currentQuestionIndex + 1} di {quizQuestions.length}</span>
                    <span>Punteggio attuale: <span className="text-[#5A5A40] font-bold">{correctAnswersCount} Risposte Esatte</span></span>
                  </div>

                  <div className="mb-6">
                    <span className="text-[10px] uppercase font-bold text-[#8a5a00] bg-[#faedcd] px-2 py-0.5 rounded">
                      Difficoltà: {quizQuestions[currentQuestionIndex].difficulty}
                    </span>
                    <h4 className="font-serif py-3 font-bold text-xl text-stone-800 leading-tight">
                      {quizQuestions[currentQuestionIndex].question}
                    </h4>
                  </div>

                  {/* Options */}
                  <div className="flex flex-col gap-3">
                    {quizQuestions[currentQuestionIndex].options.map((opt, idx) => {
                      const isSelected = selectedAnswerIndex === idx;
                      const isCorrectAnswer = idx === quizQuestions[currentQuestionIndex].correctAnswerIndex;
                      
                      let optStyle = 'bg-white border-[#d6d6cc] hover:bg-stone-50';
                      if (isSelected) {
                        optStyle = 'bg-[#faedcd]/40 border-2 border-[#d4a373]';
                      }
                      
                      if (quizSubmitted) {
                        if (isCorrectAnswer) {
                          optStyle = 'bg-emerald-100 border-2 border-[#5A5A40] text-emerald-850';
                        } else if (isSelected) {
                          optStyle = 'bg-red-100 border-2 border-red-500 text-red-850';
                        } else {
                          optStyle = 'bg-white opacity-50 border-stone-200';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          disabled={quizSubmitted}
                          onClick={() => handleSelectAnswer(idx)}
                          className={`w-full text-left p-4 rounded-xl border flex items-center gap-3 transition-all text-sm font-serif ${optStyle}`}
                        >
                          <span className="w-6 h-6 rounded-full bg-stone-100 border border-stone-350 text-xs flex items-center justify-center font-bold font-mono">
                            {idx + 1}
                          </span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Feedback explanation prints */}
                  {quizSubmitted && (
                    <div className="bg-[#e9edc9] rounded-xl p-4 border border-[#5A5A40] text-xs text-stone-850 mt-5 leading-relaxed font-serif">
                      <span className="font-bold flex items-center gap-1.5 text-[#5A5A40] mb-1">
                        <Info size={14} /> Spiegazione Didattica e Culturale:
                      </span>
                      {quizQuestions[currentQuestionIndex].explanation}
                    </div>
                  )}

                  {/* Command Row */}
                  <div className="mt-6 pt-4 border-t border-stone-200 flex justify-end">
                    {!quizSubmitted ? (
                      <button
                        onClick={handleSubmitQuizAnswer}
                        disabled={selectedAnswerIndex === null}
                        className={`py-3 px-6 rounded-xl font-serif italic text-sm font-bold shadow ${
                          selectedAnswerIndex === null
                            ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                            : 'bg-[#d4a373] text-white hover:bg-[#c29262]'
                        }`}
                      >
                        Invia Risposta 🥾
                      </button>
                    ) : (
                      <button
                        onClick={handleNextQuizQuestion}
                        className="bg-[#5A5A40] text-white hover:bg-[#4a4a34] font-serif italic py-3 px-6 rounded-xl text-sm font-bold shadow"
                      >
                        {currentQuestionIndex + 1 < quizQuestions.length ? 'Prossima Domanda' : 'Vedi Risultato Finale'}
                      </button>
                    )}
                  </div>

                </div>
              ) : (
                /* Completed screen */
                <div className="bg-[#e9edc9] rounded-2xl p-6 text-center flex flex-col items-center gap-4">
                  <span className="text-6xl animate-bounce">🥇🥾🧀</span>
                  <h4 className="font-serif font-black text-2xl text-[#5A5A40]">Certificato di Alpeggio Conseguito!</h4>
                  <p className="text-sm text-stone-700 max-w-[480px]">
                    Hai superato il quiz della pastorizia sostenibile della Valle d'Aosta! Risposte corrette: <span className="font-black text-lg">{correctAnswersCount}</span> / 5.
                  </p>
                  <p className="text-xs text-stone-600 font-medium">
                    Il presidio ti premia con <span className="font-bold text-[#8a5a00]">{correctAnswersCount} biscotti dell'alpeggio</span> utili per potenziare i livelli della tua mandria nella Vazzadex!
                  </p>

                  <button
                    onClick={handleResetQuiz}
                    className="bg-[#5A5A40] text-white hover:bg-[#4a4a34] font-serif font-bold py-2 px-6 rounded-xl text-sm mt-4 shadow"
                  >
                    Mettiti alla prova di nuovo
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT SIDEBAR PANEL: Styled identically to Natural Tones */}
        <div id="vazzadec-sidebar" className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Recent capture Polarid Style */}
          <div className="bg-white rounded-[32px] p-5 shadow-sm border border-[#e5e5db]">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-serif italic font-extrabold text-lg text-[#5A5A40]">Ultimo Incontro</h3>
              <span className="text-[10px] bg-[#faedcd] text-[#8a5a00] font-mono px-3 py-1 rounded-full font-bold uppercase tracking-tight">
                Recente
              </span>
            </div>

            {lastCapturedCow ? (
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-[#fefae0] rounded-2xl overflow-hidden border border-[#e9edc9] flex items-center justify-center relative shadow-inner">
                  {lastCapturedCow.customPhoto ? (
                    <img src={lastCapturedCow.customPhoto} className="w-full h-full object-cover" alt="Mucca" />
                  ) : (
                    <span className="text-5xl">🐄</span>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="text-sm font-bold text-[#5A5A40] font-serif">{lastCapturedCow.breed}</div>
                  <div className="text-[10px] text-[#8a8a7c] uppercase font-bold mt-0.5">Soverano: "{lastCapturedCow.name}"</div>
                  <div className="text-[11px] text-[#8a8a7c] mt-1.5">Catturata a: <span className="italic font-bold font-serif">{lastCapturedCow.capturedLocation.split(':')[0]}</span></div>
                  
                  <div className="flex gap-2 mt-3.5">
                    <div className="bg-[#f5f5f0] p-1.5 rounded flex flex-col items-center flex-1 border border-[#e5e5db] shadow-inner">
                      <span className="text-[9px] uppercase opacity-60 font-bold">Stima Peso</span>
                      <span className="text-xs font-bold text-stone-850">{lastCapturedCow.weight} kg</span>
                    </div>
                    <div className="bg-[#f5f5f0] p-1.5 rounded flex flex-col items-center flex-1 border border-[#e5e5db] shadow-inner">
                      <span className="text-[9px] uppercase opacity-60 font-bold">Rarità</span>
                      <span className="text-xs font-bold text-stone-850 font-serif">{lastCapturedCow.rarity.substring(0,4)}.</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-500 italic text-center py-4">Nessun incontro recente. Simula il cammino nel radar dei sentieri!</p>
            )}
          </div>

          {/* Bataille de Reines Active Leaderboard */}
          <div className="flex-1 flex flex-col gap-3">
            <h3 className="font-serif italic text-lg text-[#5A5A40] px-2 font-bold flex items-center gap-1.5">
              <Trophy size={18} className="text-[#d4a373]" /> Graduatoria Bataille <span className="text-xs font-sans not-italic text-[#8a8a7c] font-semibold">(Punteggio Regionale)</span>
            </h3>
            
            <div className="bg-white/75 rounded-[32px] overflow-hidden border border-[#e5e5db] p-4 shadow-sm">
              <div className="flex flex-col gap-2">
                {activeLeaderboard.map((item, idx) => {
                  const medalColor = idx === 0 ? 'text-[#d4a373]' : idx === 1 ? 'text-stone-500' : 'text-stone-400';
                  return (
                    <div 
                      key={idx} 
                      className={`flex items-center justify-between p-3 bg-white rounded-2xl border transition-all ${
                        item.isUser 
                          ? 'border-2 border-[#d4a373] shadow-md bg-stone-50' 
                          : 'border-transparent bg-white/40 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 flex items-center justify-center font-bold text-sm ${medalColor}`}>
                          {idx + 1}
                        </span>
                        
                        <div className="w-8 h-8 rounded-full bg-[#faedcd] border border-[#d4a373] flex items-center justify-center text-sm">
                          {item.isUser ? '🤠' : '👩‍🌾'}
                        </div>
                        
                        <div>
                          <div className="text-xs font-bold text-stone-800">{item.name}</div>
                          <div className="text-[9px] text-stone-500 italic mt-0.2">
                            Reina fidata: "{item.cow}"
                          </div>
                        </div>
                      </div>

                      <div className="text-xs font-bold font-serif text-[#5A5A40]">
                        {item.score} pts
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Trigger Button to camera */}
          <button 
            onClick={() => { setActiveTab('camera'); handleStartCamera(); }}
            className="w-full h-16 bg-[#d4a373] hover:bg-[#c29262] text-white rounded-[24px] font-serif italic text-xl shadow-lg flex items-center justify-center gap-3 transform active:scale-95 transition-all cursor-pointer"
          >
            <span>📷</span> FOTOGRAFA LA REINA
          </button>

          {/* Achievement badge collection */}
          <div className="bg-white rounded-[32px] p-5 shadow-sm border border-[#e5e5db]">
            <h4 className="font-serif italic font-bold text-[#5A5A40] text-sm mb-3">Distintivi dell'Esploratore Alpino</h4>
            <div className="grid grid-cols-2 gap-2 text-center">
              {achievements.map((ach) => (
                <div 
                  key={ach.id} 
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center relative overflow-hidden transition-all ${
                    ach.unlockedAt 
                      ? 'bg-[#e9edc9]/20 border-[#5A5A40]' 
                      : 'bg-stone-50 border-stone-200 opacity-60'
                  }`}
                  title={ach.description}
                >
                  <span className="text-lg">{ach.icon}</span>
                  <div className="text-[10px] font-bold text-stone-800 mt-1">{ach.title}</div>
                  
                  {ach.unlockedAt ? (
                    <span className="text-[8px] uppercase tracking-tighter text-emerald-700 bg-emerald-100 rounded px-1 mt-1 font-mono">
                      SBLOCCATO
                    </span>
                  ) : (
                    <span className="text-[8px] uppercase tracking-tighter text-stone-500 mt-1 font-mono">
                      BLOCCATO
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Sustainable footer printed inside */}
      <footer id="vazzadec-footer" className="bg-[#5A5A40] text-white py-4 px-6 md:px-8 text-xs border-t border-[#4a4a34] mt-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <p className="opacity-90 font-serif italic text-[11px] text-[#e9edc9] leading-relaxed transition-all duration-500">
              {environmentalTips[tipIndex]}
            </p>
          </div>

          <div className="flex gap-6 text-[10px] uppercase font-mono tracking-widest text-[#e9edc9] opacity-80">
            <button onClick={() => { setActiveTab('quiz'); playSynthSound('clink'); }} className="hover:underline">Scuola di Alpeggio</button>
            <button onClick={() => { setActiveTab('radar'); playSynthSound('clink'); }} className="hover:underline">Mappa Sentieri VDA</button>
            <button onClick={() => alert('Vazzadex - BovineGO v1.4.0. Sviluppato in collaborazione con la riserva dei pascoli d\'alpeggio della Valle d\'Aosta.')} className="hover:underline">Crediti Alpini</button>
          </div>
        </div>
      </footer>

    </div>
  );
}
