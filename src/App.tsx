/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  PokemonTypeId,
  CompactPokemon,
  RoundRecord,
  PlayerState,
  GameMode,
  GameStatus,
  OnlineRoom,
  Difficulty,
  DIFFICULTY_SETTINGS,
} from './types/game';
import { ALL_TYPE_IDS } from './data/typesInfo';
import { hasType, formatPokemonName } from './utils/pokemonApi';
import { getWebSocketUrl } from './config';
import { soundManager } from './utils/audio';
import { TypeDisplay } from './components/TypeDisplay';
import { TypeSelectorGrid } from './components/TypeSelectorGrid';
import { ExpandableSearchBar } from './components/ExpandableSearchBar';
import { NotebookModal } from './components/NotebookModal';
import { FeedbackBanner } from './components/FeedbackBanner';
import { GameIntroStudio } from './components/GameIntroStudio';
import {
  Volume2,
  VolumeX,
  Globe,
  User,
  RotateCcw,
  Copy,
  Check,
  Play,
  ArrowRight,
  ArrowLeft,
  Wifi,
  WifiOff,
  Gauge,
  ShieldAlert,
  Home,
  Sparkles,
  Loader2,
} from 'lucide-react';

export default function App() {
  const [showIntro, setShowIntro] = useState<boolean>(true);
  const [gameMode, setGameMode] = useState<GameMode>('solo');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [status, setStatus] = useState<GameStatus>('idle');
  const [currentType, setCurrentType] = useState<PokemonTypeId | PokemonTypeId[] | null>(null);
  const [shufflingType, setShufflingType] = useState<PokemonTypeId | PokemonTypeId[] | null>(null);

  // Solo State
  const [soloPlayer, setSoloPlayer] = useState<PlayerState>({
    id: 'solo_1',
    name: 'Você',
    score: 0,
    color: '#3b82f6',
    records: [],
  });

  // Online Multiplayer State
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoom | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [myCurrentGuess, setMyCurrentGuess] = useState<CompactPokemon | null>(null);
  const [soloLastPokemon, setSoloLastPokemon] = useState<CompactPokemon | null>(null);
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('poketype_nickname') || 'Treinador';
  });
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [onlineView, setOnlineView] = useState<'menu' | 'lobby' | 'playing'>('menu');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Common Game State
  const [usedPokemonIds, setUsedPokemonIds] = useState<Set<number>>(new Set());
  const [isNotebookOpen, setIsNotebookOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());

  // Reaction timer states
  const [roundStartTime, setRoundStartTime] = useState<number>(0);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [bestTimeMs, setBestTimeMs] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('poketype_best_reaction');
      return saved ? Number(saved) : null;
    } catch {
      return null;
    }
  });

  // Visual effects
  const [showSparkle, setShowSparkle] = useState<boolean>(false);
  const [showRedX, setShowRedX] = useState<boolean>(false);

  // Feedback banner state
  const [feedback, setFeedback] = useState<{
    type: 'wrong_type' | 'already_used' | 'invalid';
    pokemon?: CompactPokemon;
    targetType?: PokemonTypeId | PokemonTypeId[];
    message?: string;
  } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const pendingQueueRef = useRef<string[]>([]);
  const shouldReconnectRef = useRef<boolean>(false);

  // Active difficulty configuration
  const activeDifficulty =
    gameMode === 'online' && onlineRoom ? onlineRoom.difficulty : difficulty;
  const currentDiffConfig = DIFFICULTY_SETTINGS[activeDifficulty] || DIFFICULTY_SETTINGS.easy;

  // Save nickname
  const handleNameChange = (name: string) => {
    setPlayerName(name);
    try {
      localStorage.setItem('poketype_nickname', name);
    } catch {
      // Ignore
    }
  };

  // Sound toggle handler
  const handleToggleMute = () => {
    const next = soundManager.toggleMute();
    setIsMuted(next);
  };

  // Setup WebSocket connection for Online Multiplayer.
  // Retry silencioso: reconecta sozinho (Render cold start) sem avisar nada.
  const connectWebSocket = useCallback(() => {
    shouldReconnectRef.current = true;
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const scheduleReconnect = () => {
      setIsConnected(false);
      if (!shouldReconnectRef.current) return;
      if (reconnectTimerRef.current !== null) return;
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        wsRef.current = null;
        connectWebSocket();
      }, 1500);
    };

    let socket: WebSocket;
    try {
      socket = new WebSocket(getWebSocketUrl());
    } catch {
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      setIsConnected(true);
      const queued = pendingQueueRef.current;
      pendingQueueRef.current = [];
      for (const payload of queued) {
        try {
          socket.send(payload);
        } catch {
          pendingQueueRef.current.push(payload);
          break;
        }
      }
    };

    socket.onclose = () => {
      scheduleReconnect();
    };

    // Silencioso de propósito: nada de console.error / toast / banner.
    socket.onerror = () => {
      setIsConnected(false);
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'room_joined') {
          setMyPlayerId(msg.playerId);
          setOnlineRoom(msg.room);
          setOnlineView(msg.room.status === 'lobby' ? 'lobby' : 'playing');
          setStatus(msg.room.status);
          setFeedback(null);
        } else if (
          msg.type === 'player_joined' ||
          msg.type === 'player_left' ||
          msg.type === 'room_updated'
        ) {
          setOnlineRoom(msg.room);
        } else if (msg.type === 'selecting_type') {
          setOnlineRoom(msg.room);
          setOnlineView('playing');
          setStatus('selecting_type');
          setIsNotebookOpen(false);
          setShowIntro(false);
          setFeedback(null);
          setMyCurrentGuess(null);
        } else if (msg.type === 'round_started') {
          setOnlineRoom(msg.room);
          setOnlineView('playing');
          setStatus('playing');
          setCurrentType(msg.room.currentType);
          setRoundStartTime(msg.room.roundStartTime);
          setUsedPokemonIds(new Set(msg.room.usedPokemonIds || []));
          setMyCurrentGuess(null);
          setIsNotebookOpen(false);
          setFeedback(null);
          setShowIntro(false);
          soundManager.playTypeSelected();
        } else if (msg.type === 'player_submitted_guess') {
          setOnlineRoom(msg.room);
        } else if (msg.type === 'round_won') {
          setOnlineRoom(msg.room);
          setOnlineView('playing');
          setStatus(msg.room.status);
          setUsedPokemonIds(new Set(msg.room.usedPokemonIds || []));
          setMyCurrentGuess(null);
          soundManager.playCorrect();

          if (msg.room.status === 'game_won') {
            confetti({ particleCount: 110, spread: 75, origin: { y: 0.6 } });
          }

          setIsNotebookOpen(true);
        } else if (msg.type === 'guess_result') {
          if (!msg.success) {
            soundManager.playWrong();
            setShowRedX(true);
            setTimeout(() => setShowRedX(false), 800);
            setFeedback({
              type: msg.reason,
              pokemon: msg.pokemon,
              targetType: msg.targetType,
              message: msg.message,
            });
          }
        } else if (msg.type === 'room_reset') {
          setOnlineRoom(msg.room);
          setStatus('lobby');
          setOnlineView('lobby');
          setIsNotebookOpen(false);
          setShowIntro(true);
        } else if (msg.type === 'error') {
          setFeedback({
            type: 'invalid',
            message: msg.message,
          });
        }
      } catch {
        // silencioso de propósito
      }
    };

    wsRef.current = socket;
  }, []);

  // Envia ou enfileira p/ mandar assim que conectar (cobre cold start da Render).
  const sendJson = useCallback(
    (obj: unknown) => {
      const payload = JSON.stringify(obj);
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(payload);
          return;
        } catch {
          // cai no enfileiramento abaixo
        }
      }
      pendingQueueRef.current.push(payload);
      connectWebSocket();
    },
    [connectWebSocket]
  );

  // Connect socket when entering online mode; encerra ao sair.
  useEffect(() => {
    if (gameMode === 'online') {
      connectWebSocket();
    } else {
      shouldReconnectRef.current = false;
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      try {
        wsRef.current?.close();
      } catch {
        // silencioso
      }
      wsRef.current = null;
      pendingQueueRef.current = [];
      setIsConnected(false);
    }
  }, [gameMode, connectWebSocket]);

  // Limpa timer de retry ao desmontar.
  useEffect(() => {
    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, []);

  // Online actions
  const handleCreateOnlineRoom = () => {
    sendJson({
      type: 'create_room',
      name: playerName.trim() || 'Jogador',
      difficulty,
    });
  };

  const handleJoinOnlineRoom = () => {
    if (!joinCodeInput.trim()) return;
    sendJson({
      type: 'join_room',
      code: joinCodeInput.trim().toUpperCase(),
      name: playerName.trim() || 'Jogador',
    });
  };

  const handleSetOnlineDifficulty = (diff: Difficulty) => {
    setDifficulty(diff);
    sendJson({
      type: 'set_difficulty',
      difficulty: diff,
    });
  };

  const handleStartOnlineGame = () => {
    sendJson({
      type: 'start_game',
    });
  };

  const handleOnlineNextRound = () => {
    sendJson({
      type: 'next_round',
    });
  };

  const copyRoomCode = () => {
    if (!onlineRoom) return;
    navigator.clipboard.writeText(onlineRoom.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Timer loop for Reaction Stopwatch & Round Countdown
  useEffect(() => {
    if (status === 'playing') {
      const start = gameMode === 'online' && onlineRoom ? onlineRoom.roundStartTime : Date.now();
      setRoundStartTime(start);
      setElapsedMs(0);

      const limitMs = currentDiffConfig.roundTimeSeconds * 1000;

      timerRef.current = window.setInterval(() => {
        const diff = Date.now() - start;
        setElapsedMs(diff);

        // Check timeout
        if (diff >= limitMs) {
          clearInterval(timerRef.current!);
          soundManager.playWrong();
          setShowRedX(true);
          setTimeout(() => setShowRedX(false), 800);

          setFeedback({
            type: 'invalid',
            message: `Tempo esgotado! Limite de ${currentDiffConfig.roundTimeSeconds}s alcançado.`,
          });

          if (gameMode === 'online') {
            sendJson({ type: 'round_timeout' });
          } else {
            // In Solo, roll next round
            setTimeout(() => {
              startSoloRound();
            }, 1200);
          }
        }
      }, 30);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status, gameMode, onlineRoom, currentDiffConfig]);

  // Solo Start Round respecting shuffle delay
  const startSoloRound = useCallback((targetDiff?: Difficulty | unknown) => {
    const validDiff: Difficulty =
      typeof targetDiff === 'string' && targetDiff in DIFFICULTY_SETTINGS
        ? (targetDiff as Difficulty)
        : (difficulty in DIFFICULTY_SETTINGS ? difficulty : 'easy');
    const diffConfig = DIFFICULTY_SETTINGS[validDiff] || DIFFICULTY_SETTINGS.easy;
    setFeedback(null);
    setIsNotebookOpen(false);
    setShowSparkle(false);
    setShowRedX(false);
    setStatus('shuffling');

    // Number of shuffles depends on difficulty delay
    const totalDurationMs = (diffConfig?.shuffleDelaySeconds ?? 3) * 1000;
    const intervalTime = 70;
    const maxShuffles = Math.max(4, Math.floor(totalDurationMs / intervalTime));
    let shuffleCount = 0;

    const shuffleInterval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * ALL_TYPE_IDS.length);
      const randomType = ALL_TYPE_IDS[randomIdx];
      setShufflingType(randomType);
      soundManager.playTick();
      shuffleCount++;

      if (shuffleCount >= maxShuffles) {
        clearInterval(shuffleInterval);
        const chosenType = ALL_TYPE_IDS[Math.floor(Math.random() * ALL_TYPE_IDS.length)];
        setCurrentType(chosenType);
        setShufflingType(null);
        soundManager.playTypeSelected();
        setStatus('playing');
      }
    }, intervalTime);
  }, [difficulty]);

  const handleStartSolo = (selectedDifficulty?: Difficulty) => {
    const chosenDiff = selectedDifficulty || difficulty;
    setDifficulty(chosenDiff);
    setGameMode('solo');
    setSoloPlayer({
      id: 'solo_1',
      name: playerName.trim() || 'Você',
      score: 0,
      color: '#1ab783',
      records: [],
    });
    setUsedPokemonIds(new Set());
    setFeedback(null);
    setIsNotebookOpen(false);
    setShowIntro(false);
    startSoloRound(chosenDiff);
  };

  const handleStartMultiplayerCreate = (
    selectedDifficulty: Difficulty,
    playerSelectsType: boolean = true,
    numTypeSelectors: number = 2
  ) => {
    setDifficulty(selectedDifficulty);
    setGameMode('online');
    setShowIntro(true);
    sendJson({
      type: 'create_room',
      name: playerName.trim() || 'Jogador',
      difficulty: selectedDifficulty,
      playerSelectsType,
      numTypeSelectors,
    });
  };

  const handleConfirmOnlineTypes = (types: PokemonTypeId[]) => {
    sendJson({
      type: 'select_type',
      types,
    });
  };

  const handleSetOnlineSettings = (settings: {
    difficulty?: Difficulty;
    playerSelectsType?: boolean;
    numTypeSelectors?: number;
  }) => {
    sendJson({
      type: 'set_room_settings',
      ...settings,
    });
  };

  const handleStartMultiplayerJoin = (code: string) => {
    setGameMode('online');
    setShowIntro(true);
    sendJson({
      type: 'join_room',
      code: code.trim().toUpperCase(),
      name: playerName.trim() || 'Jogador',
    });
  };

  const handleLeaveRoom = () => {
    shouldReconnectRef.current = false;
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    try {
      wsRef.current?.close();
    } catch {
      // silencioso
    }
    wsRef.current = null;
    pendingQueueRef.current = [];
    setIsConnected(false);
    setOnlineRoom(null);
    setGameMode('solo');
    setStatus('idle');
    setOnlineView('menu');
    setShowIntro(true);
  };

  // Handle player selection of a Pokemon
  const handleSelectPokemon = (pokemon: CompactPokemon) => {
    if (status !== 'playing') return;

    if (gameMode === 'online') {
      setMyCurrentGuess(pokemon);
      soundManager.playTick();
      sendJson({
        type: 'submit_guess',
        pokemonId: pokemon.id,
      });
      return;
    }

    // Solo Mode Validation
    if (!currentType) return;

    // Check pool restriction in difficulty
    if (pokemon.id > currentDiffConfig.maxPokemonDex) {
      soundManager.playWrong();
      setShowRedX(true);
      setTimeout(() => setShowRedX(false), 800);
      setFeedback({
        type: 'invalid',
        message: `No modo ${currentDiffConfig.namePt}, apenas Pokémon até #${currentDiffConfig.maxPokemonDex} são permitidos!`,
      });
      return;
    }

    if (usedPokemonIds.has(pokemon.id)) {
      soundManager.playWrong();
      setShowRedX(true);
      setTimeout(() => setShowRedX(false), 800);
      setFeedback({ type: 'already_used', pokemon });
      return;
    }

    const isValid = hasType(pokemon, currentType);
    if (!isValid) {
      soundManager.playWrong();
      setShowRedX(true);
      setTimeout(() => setShowRedX(false), 800);
      setFeedback({ type: 'wrong_type', pokemon, targetType: currentType });
      return;
    }

    // Success in Solo
    const finalTimeMs = Date.now() - roundStartTime;
    if (timerRef.current) clearInterval(timerRef.current);
    setElapsedMs(finalTimeMs);
    soundManager.playCorrect();

    setShowSparkle(true);
    setTimeout(() => setShowSparkle(false), 900);

    if (!bestTimeMs || finalTimeMs < bestTimeMs) {
      setBestTimeMs(finalTimeMs);
      try {
        localStorage.setItem('poketype_best_reaction', String(finalTimeMs));
      } catch {
        // Ignore
      }
    }

    const newScore = soloPlayer.score + 1;
    const newRecord: RoundRecord = {
      round: newScore,
      playerId: soloPlayer.id,
      playerName: soloPlayer.name,
      typeId: currentType,
      pokemon,
      reactionTimeMs: finalTimeMs,
      timestamp: Date.now(),
    };

    setSoloPlayer((prev) => ({
      ...prev,
      score: newScore,
      records: [...prev.records, newRecord],
    }));

    setSoloLastPokemon(pokemon);
    setUsedPokemonIds((prev) => new Set(prev).add(pokemon.id));
    setFeedback(null);

    if (newScore >= 5) {
      setStatus('game_won');
      confetti({ particleCount: 110, spread: 75, origin: { y: 0.6 } });
    } else {
      setStatus('round_won');
    }

    setTimeout(() => setIsNotebookOpen(true), 300);
  };

  // Determine active players & state for Notebook
  const activePlayersList =
    gameMode === 'online' && onlineRoom ? onlineRoom.players || [] : [soloPlayer];

  const activeTurnPlayer =
    gameMode === 'online' && onlineRoom
      ? onlineRoom.players?.[onlineRoom.activePlayerIndex] || onlineRoom.players?.[0]
      : soloPlayer;

  const isMyTurnOnline =
    gameMode === 'online' ? activeTurnPlayer?.id === myPlayerId : true;

  const isHostOnline =
    gameMode === 'online' && onlineRoom
      ? onlineRoom.players?.find((p) => p.id === myPlayerId)?.isHost
      : false;

  const winnerPlayer =
    gameMode === 'online' && onlineRoom && onlineRoom.winnerId
      ? onlineRoom.players?.find((p) => p.id === onlineRoom.winnerId) || null
      : soloPlayer.score >= 5
        ? soloPlayer
        : null;

  const [activeSlide, setActiveSlide] = useState<'slide-1' | 'slide-1791593896020'>('slide-1');

  const isPlaying =
    status === 'playing' ||
    status === 'shuffling' ||
    status === 'selecting_type' ||
    status === 'round_won' ||
    (status === 'game_won' && !showIntro) ||
    (gameMode === 'online' && onlineView === 'playing');

  const handleBackToMenu = () => {
    soundManager.playSlideWhoosh();
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus('idle');
    setFeedback(null);
    setIsNotebookOpen(false);
    setShowIntro(true);
    setActiveSlide('slide-1791593896020');
  };

  const handleBackToSlide1 = () => {
    soundManager.playSlideWhoosh();
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus('idle');
    setFeedback(null);
    setIsNotebookOpen(false);
    setShowIntro(true);
    setActiveSlide('slide-1');
  };

  return (
    <>
      {/* Loading minimal do multiplayer: só o ícone, sem texto, silencioso */}
      {gameMode === 'online' && !isConnected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0d14]/70 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 text-[#1ab783] animate-spin" />
        </div>
      )}

      {/* Visual Sparkle Effect on Correct Guess */}
      <AnimatePresence>
        {showSparkle && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1.2 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          >
            <div className="text-7xl sm:text-8xl filter drop-shadow-[0_0_25px_rgba(26,183,131,0.8)] animate-spin">
              ✨
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visual Red 'X' on Wrong Guess */}
      <AnimatePresence>
        {showRedX && (
          <motion.div
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1.3, rotate: [-10, 10, -5, 0] }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          >
            <div className="text-8xl sm:text-9xl font-black text-rose-500 filter drop-shadow-[0_0_30px_rgba(244,63,94,0.9)]">
              ✕
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unified Canvas Stage containing Slide 1, Slide 2 Menu, and Ported Game Screen */}
      <GameIntroStudio
        onStartSolo={handleStartSolo}
        onStartMultiplayerCreate={handleStartMultiplayerCreate}
        onStartMultiplayerJoin={handleStartMultiplayerJoin}
        playerName={playerName}
        onPlayerNameChange={handleNameChange}
        currentDifficulty={difficulty}
        onlineRoom={onlineRoom}
        myPlayerId={myPlayerId}
        isHostOnline={isHostOnline}
        onStartOnlineGame={handleStartOnlineGame}
        onSetOnlineDifficulty={handleSetOnlineDifficulty}
        onSetOnlineSettings={handleSetOnlineSettings}
        onLeaveRoom={handleLeaveRoom}
        isPlaying={isPlaying}
        activeSlide={activeSlide}
        onChangeSlide={setActiveSlide}
        gameContent={
          <div className="w-full h-full flex flex-col justify-between selection:bg-[#1ab783] selection:text-[#022c22] font-sans relative z-30 select-none max-w-xl mx-auto py-1 sm:py-3 px-1 sm:px-2">
            {/* Top Bar for Game Screen */}
            <header className="w-full flex items-center justify-between pb-1.5 sm:pb-2 border-b border-[#27302c]/60 shrink-0">
              <button
                type="button"
                onClick={handleBackToMenu}
                className="px-2.5 sm:px-3 py-1 rounded-full bg-[#1b201e] hover:bg-[#222725] border border-[#27302c] text-[#a0aba5] hover:text-[#e1e3e0] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors active:scale-95"
                title="Voltar ao menu"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Menu</span>
              </button>

              {gameMode === 'online' && onlineRoom && (
                <div
                  onClick={copyRoomCode}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1b201e] border border-[#27302c] rounded-full text-xs font-mono font-bold text-[#1ab783] cursor-pointer hover:border-[#1ab783]/60 transition-colors"
                  title="Clique para copiar código da sala"
                >
                  <span>Sala: {onlineRoom.code}</span>
                  {copiedCode ? (
                    <Check className="w-3.5 h-3.5 text-[#1ab783]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#89938f]" />
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleToggleMute}
                className="p-1.5 rounded-full bg-[#1b201e] hover:bg-[#222725] border border-[#27302c] text-[#a0aba5] hover:text-[#e1e3e0] cursor-pointer transition-colors active:scale-95"
                title={isMuted ? 'Ativar som' : 'Desativar som'}
              >
                {isMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-[#1ab783]" />
                )}
              </button>
            </header>

            {/* Main Game Stage */}
            <main className="flex-1 w-full flex flex-col justify-center items-center gap-3 sm:gap-5 my-auto overflow-y-auto py-1">
              {/* Error / Wrong Answer Feedback Banner */}
              <FeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />

              {/* In Online Mode: Player Type Selection Grid (6x3) if selecting_type */}
              {gameMode === 'online' && status === 'selecting_type' ? (
                <TypeSelectorGrid
                  isMyTurn={Boolean(
                    myPlayerId &&
                      (onlineRoom?.selectorPlayerIds?.includes(myPlayerId) ||
                        myPlayerId === onlineRoom?.selectorPlayerId)
                  )}
                  hasSubmitted={Boolean(
                    myPlayerId && onlineRoom?.submittedSelectorIds?.includes(myPlayerId)
                  )}
                  totalSelectors={onlineRoom?.selectorPlayerIds?.length || 1}
                  selectorPlayerNames={
                    onlineRoom?.players
                      .filter(
                        (p) =>
                          onlineRoom?.selectorPlayerIds?.includes(String(p.id)) ||
                          String(p.id) === String(onlineRoom?.selectorPlayerId)
                      )
                      .map((p) => p.name) || []
                  }
                  selectorPlayerName={
                    onlineRoom?.players.find(
                      (p) =>
                        onlineRoom?.selectorPlayerIds?.includes(String(p.id)) ||
                        String(p.id) === String(onlineRoom?.selectorPlayerId)
                    )?.name || 'Oponente'
                  }
                  maxDexId={currentDiffConfig.maxPokemonDex}
                  onConfirmSelection={handleConfirmOnlineTypes}
                />
              ) : (
                <>
                  {/* Computer Selected Type - Only Official Pokemon Type Icon */}
                  <TypeDisplay
                    currentType={currentType}
                    isShuffling={status === 'shuffling'}
                    shufflingType={shufflingType}
                  />

                  {/* Search Bar with Live Instant Grid - WITHOUT revealing pokemon types & with difficulty maxDexId filter */}
                  <ExpandableSearchBar
                    targetType={currentType}
                    onSelectPokemon={handleSelectPokemon}
                    disabled={status !== 'playing' || (gameMode === 'online' && !!myCurrentGuess)}
                    usedPokemonIds={usedPokemonIds}
                    maxDexId={currentDiffConfig.maxPokemonDex}
                  />

                  {/* Status indicator for simultaneous multiplayer with all players visible */}
                  {gameMode === 'online' && status === 'playing' && (
                    <div className="w-full flex flex-col items-center gap-1.5 py-1">
                      {/* Live player list with scroll support for 4+ players */}
                      <div className="w-full overflow-x-auto pb-1 flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 px-1 scrollbar-none">
                        {onlineRoom?.players.map((p) => {
                          const hasGuessed = Boolean(onlineRoom?.currentGuesses?.[p.id]);
                          const isMe = p.id === myPlayerId;
                          return (
                            <div
                              key={p.id}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all shrink-0 ${
                                hasGuessed
                                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                                  : isMe
                                    ? 'bg-[#1b201e] border-[#1ab783]/60 text-[#e1e3e0]'
                                    : 'bg-[#151918]/70 border-[#27302c] text-[#89938f]'
                              }`}
                            >
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: p.color }}
                              />
                              <span className="truncate max-w-[80px] sm:max-w-[100px]">
                                {p.name}
                                {isMe ? ' (Você)' : ''}
                              </span>
                              <span className="text-[10px] text-amber-400 font-mono font-bold">
                                {p.score}★
                              </span>
                              {hasGuessed ? (
                                <span className="text-[10px] text-emerald-400 font-bold">✓</span>
                              ) : (
                                <span className="text-[10px] opacity-60">⏱</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="text-center text-xs text-[#89938f] font-medium px-2">
                        {myCurrentGuess ? (
                          <span className="text-[#1ab783] animate-pulse">
                            Palpite enviado: {formatPokemonName(myCurrentGuess.name)}! Aguardando os demais jogadores ({Object.keys(onlineRoom?.currentGuesses || {}).length}/{onlineRoom?.players?.length || 0})...
                          </span>
                        ) : onlineRoom?.currentGuesses && Object.keys(onlineRoom.currentGuesses).length > 0 ? (
                          <span className="text-amber-400 font-semibold animate-pulse">
                            {Object.keys(onlineRoom.currentGuesses).length} jogador(es) já enviaram palpite! Escolha o seu agora!
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}
                </>
              )}
            </main>
          </div>
        }
      />

      {/* The REALISTIC LINED NOTEBOOK MODAL with PRÓXIMA RODADA as the only button below */}
      <NotebookModal
        isOpen={isNotebookOpen}
        gameMode={gameMode}
        players={activePlayersList}
        activePlayerId={myPlayerId || soloPlayer.id}
        lastScoredPlayerId={
          gameMode === 'online' && onlineRoom
            ? onlineRoom.lastScoredPlayerId
            : soloPlayer.id
        }
        onNextRound={gameMode === 'online' ? handleOnlineNextRound : () => startSoloRound()}
        isGameWon={status === 'game_won'}
        winnerPlayer={winnerPlayer}
        onClose={() => setIsNotebookOpen(false)}
        lastRoundGuesses={onlineRoom?.lastRoundGuesses}
        soloLastPokemon={soloLastPokemon}
      />
    </>
  );
}
