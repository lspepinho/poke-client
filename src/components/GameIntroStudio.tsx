import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from '../utils/audio';
import { renderMaterial3Control, M3RenderResult } from '../utils/material3Renderer';
import { Difficulty, OnlineRoom, DIFFICULTY_SETTINGS } from '../types/game';
import { asset } from '../utils/asset';
import { Copy, Check, Crown, LogOut, Sliders } from 'lucide-react';

interface GameIntroStudioProps {
  onStartSolo: (difficulty: Difficulty) => void;
  onStartMultiplayerCreate: (
    difficulty: Difficulty,
    playerSelectsType?: boolean,
    numTypeSelectors?: number
  ) => void;
  onStartMultiplayerJoin: (code: string) => void;
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  currentDifficulty?: Difficulty;
  // Lobby integration props:
  onlineRoom?: OnlineRoom | null;
  myPlayerId?: string | null;
  isHostOnline?: boolean;
  onStartOnlineGame?: () => void;
  onSetOnlineDifficulty?: (diff: Difficulty) => void;
  onSetOnlineSettings?: (settings: {
    difficulty?: Difficulty;
    playerSelectsType?: boolean;
    numTypeSelectors?: number;
  }) => void;
  onLeaveRoom?: () => void;
  // Ported game screen props:
  isPlaying?: boolean;
  gameContent?: React.ReactNode;
  activeSlide?: 'slide-1' | 'slide-1791593896020';
  onChangeSlide?: (slide: 'slide-1' | 'slide-1791593896020') => void;
}

// Interactive component using M3 State Images generated on canvas
const M3ButtonFromCanvas: React.FC<{
  controlResult: M3RenderResult;
  onClick: () => void;
  className?: string;
}> = ({ controlResult, onClick, className = '' }) => {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const normalUrl =
    controlResult.states.find((s) => s.stateKey === 'normal')?.dataUrl || controlResult.normalDataUrl;
  const hoveredUrl =
    controlResult.states.find((s) => s.stateKey === 'hovered')?.dataUrl || controlResult.hoveredDataUrl;
  const pressedUrl =
    controlResult.states.find((s) => s.stateKey === 'pressed')?.dataUrl || hoveredUrl;

  const currentUrl = pressed ? pressedUrl : hovered ? hoveredUrl : normalUrl;

  return (
    <div
      className={`w-full cursor-pointer select-none transition-transform duration-150 active:scale-[0.98] ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onClick={onClick}
    >
      <img
        src={currentUrl}
        alt={controlResult.label}
        className="w-full h-auto object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)] hover:brightness-105 transition-all"
      />
    </div>
  );
};

export const GameIntroStudio: React.FC<GameIntroStudioProps> = ({
  onStartSolo,
  onStartMultiplayerCreate,
  onStartMultiplayerJoin,
  playerName,
  onPlayerNameChange,
  currentDifficulty = 'easy',
  onlineRoom,
  myPlayerId,
  isHostOnline = false,
  onStartOnlineGame,
  onSetOnlineDifficulty,
  onSetOnlineSettings,
  onLeaveRoom,
  isPlaying = false,
  gameContent,
  activeSlide,
  onChangeSlide,
}) => {
  // If already in a room, start directly on Slide 2 with lobby view
  const [internalSlideId, setInternalSlideId] = useState<'slide-1' | 'slide-1791593896020'>(
    activeSlide || (onlineRoom ? 'slide-1791593896020' : 'slide-1')
  );

  const currentSlideId = activeSlide !== undefined ? activeSlide : internalSlideId;

  const setSlide = (newSlide: 'slide-1' | 'slide-1791593896020') => {
    setInternalSlideId(newSlide);
    onChangeSlide?.(newSlide);
  };

  const [activeSubmenu, setActiveSubmenu] = useState<'root' | 'difficulty' | 'multiplayer'>(
    onlineRoom ? 'multiplayer' : 'root'
  );
  const [joinCode, setJoinCode] = useState<string>('');
  // Use settings from previous screen: default to passed currentDifficulty
  const [mpDifficulty, setMpDifficulty] = useState<Difficulty>(currentDifficulty);
  const [playerSelectsType, setPlayerSelectsType] = useState<boolean>(true);
  const [numTypeSelectors, setNumTypeSelectors] = useState<number>(2);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [showDifficultyEditor, setShowDifficultyEditor] = useState<boolean>(false);

  // Responsive viewport detection for mobile portrait, landscape, and small/split PC windows
  const [windowDimensions, setWindowDimensions] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1365,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  }));

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isCompact =
    windowDimensions.width < 960 ||
    windowDimensions.height < 580 ||
    windowDimensions.width / windowDimensions.height < 1.3;

  // Synchronize slide if an online room is entered
  useEffect(() => {
    if (onlineRoom) {
      setSlide('slide-1791593896020');
      setActiveSubmenu('multiplayer');
    }
  }, [onlineRoom]);

  // Keep mpDifficulty aligned when currentDifficulty updates
  useEffect(() => {
    if (currentDifficulty) {
      setMpDifficulty(currentDifficulty);
    }
  }, [currentDifficulty]);

  // Sprites states for primary buttons (MULTIPLAYER & SINGLEPLAYER)
  const [mpHovered, setMpHovered] = useState<boolean>(false);
  const [mpPressed, setMpPressed] = useState<boolean>(false);
  const [spHovered, setSpHovered] = useState<boolean>(false);
  const [spPressed, setSpPressed] = useState<boolean>(false);

  const isSlide1 = currentSlideId === 'slide-1';
  const ACCENT_COLOR = '#1ab783';
  // Material You Dark Theme Surface Container
  const M3_SURFACE = '#1b201e';

  // Pre-generate M3 difficulty buttons using the exact Material 3 Renderer code with accent #1ab783 & Material You Dark Theme
  const m3Controls = useMemo(() => {
    const facil = renderMaterial3Control({
      type: 'filled-button',
      label: 'FÁCIL',
      sublabel: 'Gen 1 a 2 • 20 Segundos',
      primaryColor: ACCENT_COLOR,
      onPrimaryColor: '#022c22',
      surfaceColor: M3_SURFACE,
      onSurfaceColor: '#e1e3e0',
      customRadius: 34,
      width: 440,
      height: 68,
    });

    const medio = renderMaterial3Control({
      type: 'filled-button',
      label: 'MÉDIO',
      sublabel: 'Gen 1 a 5 • 15 Segundos',
      primaryColor: ACCENT_COLOR,
      onPrimaryColor: '#022c22',
      surfaceColor: M3_SURFACE,
      onSurfaceColor: '#e1e3e0',
      customRadius: 34,
      width: 440,
      height: 68,
    });

    const dificil = renderMaterial3Control({
      type: 'filled-button',
      label: 'DIFÍCIL',
      sublabel: 'Todas as Gerações • 10s',
      primaryColor: ACCENT_COLOR,
      onPrimaryColor: '#022c22',
      surfaceColor: M3_SURFACE,
      onSurfaceColor: '#e1e3e0',
      customRadius: 34,
      width: 440,
      height: 68,
    });

    const voltar = renderMaterial3Control({
      type: 'elevated-button',
      label: '← VOLTAR',
      primaryColor: ACCENT_COLOR,
      onPrimaryColor: ACCENT_COLOR,
      surfaceColor: M3_SURFACE,
      onSurfaceColor: '#e1e3e0',
      customRadius: 28,
      width: 440,
      height: 56,
    });

    const criarSala = renderMaterial3Control({
      type: 'filled-button',
      label: 'CRIAR SALA ONLINE',
      sublabel: 'Hospedar partida privada',
      primaryColor: ACCENT_COLOR,
      onPrimaryColor: '#022c22',
      surfaceColor: M3_SURFACE,
      onSurfaceColor: '#e1e3e0',
      customRadius: 34,
      width: 440,
      height: 68,
    });

    const iniciarPartida = renderMaterial3Control({
      type: 'filled-button',
      label: 'INICIAR PARTIDA ONLINE',
      sublabel: 'Começar para todos os jogadores',
      primaryColor: ACCENT_COLOR,
      onPrimaryColor: '#022c22',
      surfaceColor: M3_SURFACE,
      onSurfaceColor: '#e1e3e0',
      customRadius: 34,
      width: 440,
      height: 68,
    });

    return { facil, medio, dificil, voltar, criarSala, iniciarPartida };
  }, [ACCENT_COLOR, M3_SURFACE]);

  // Navigate to Slide 2 with Canva Match Move
  const handleStartClick = () => {
    soundManager.playSlideWhoosh();
    soundManager.playButtonClick();
    setSlide('slide-1791593896020');
    setActiveSubmenu('root');
  };

  // Return to Slide 1
  const handleBackToSlide1 = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    soundManager.playSlideWhoosh();
    setSlide('slide-1');
    setActiveSubmenu('root');
  };

  const copyRoomCode = () => {
    if (!onlineRoom?.code) return;
    navigator.clipboard.writeText(onlineRoom.code);
    soundManager.playButtonClick();
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const renderSubmenuContent = () => (
    <AnimatePresence mode="wait">
              {/* =================================================== */}
              {/* CASE 1: MULTIPLAYER LOBBY SCREEN (MATERIAL YOU DARK) */}
              {/* Uses settings configured on previous screen        */}
              {/* =================================================== */}
              {onlineRoom && onlineRoom.status === 'lobby' ? (
                <motion.div
                  key="online-lobby"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                  className="w-full flex flex-col gap-3 items-center bg-[#171c1a]/95 border border-[#27302c] p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-md"
                >
                  {/* Lobby Header: Code + Copy + Players Count */}
                  <div className="w-full flex items-center justify-between pb-3 border-b border-[#27302c]">
                    <div className="text-left">
                      <span className="text-[10px] uppercase font-bold text-[#89938f] tracking-wider">
                        Código da Sala
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-2xl font-black font-mono tracking-widest text-[#1ab783] drop-shadow-[0_0_8px_rgba(26,183,131,0.5)]">
                          {onlineRoom.code}
                        </span>
                        <button
                          onClick={copyRoomCode}
                          className="p-1.5 rounded-lg bg-[#1b201e] hover:bg-[#222725] text-[#a0aba5] hover:text-[#e1e3e0] transition-all cursor-pointer border border-[#27302c] active:scale-95"
                          title="Copiar código da sala"
                        >
                          {copiedCode ? (
                            <Check className="w-4 h-4 text-[#1ab783]" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-[#e1e3e0] bg-[#1b201e] border border-[#27302c] px-3.5 py-1.5 rounded-full shadow-inner">
                      {onlineRoom.players?.length || 1} Jogador(es)
                    </span>
                  </div>

                  {/* Configurações da Partida (Setadas na screen anterior) */}
                  <div className="w-full text-left bg-[#1b201e] p-3 rounded-2xl border border-[#27302c]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-[#89938f] tracking-wider">
                          Dificuldade
                        </span>
                        <span className="text-[10px] bg-[#1ab783]/15 text-[#1ab783] border border-[#1ab783]/30 px-2 py-0.5 rounded-full font-bold">
                          Setada
                        </span>
                      </div>

                      {/* Optional editor toggle for Host if needed */}
                      {isHostOnline && (
                        <button
                          type="button"
                          onClick={() => setShowDifficultyEditor(!showDifficultyEditor)}
                          className="text-[11px] text-[#89938f] hover:text-[#1ab783] flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>{showDifficultyEditor ? 'Fechar' : 'Alterar'}</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-base font-black text-[#1ab783] tracking-wide">
                        {DIFFICULTY_SETTINGS[onlineRoom.difficulty]?.namePt.toUpperCase()}
                      </span>
                      <span className="text-xs font-semibold text-[#a0aba5]">
                        {DIFFICULTY_SETTINGS[onlineRoom.difficulty]?.roundTimeSeconds}s por rodada
                      </span>
                    </div>

                    <p className="text-[11px] text-[#89938f] mt-0.5">
                      {DIFFICULTY_SETTINGS[onlineRoom.difficulty]?.poolDescription}
                    </p>

                    {/* Quick host switcher only if explicitly requested */}
                    {isHostOnline && showDifficultyEditor && (
                      <div className="grid grid-cols-3 gap-1.5 mt-2.5 pt-2.5 border-t border-[#27302c]">
                        {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => {
                              soundManager.playButtonClick();
                              onSetOnlineDifficulty?.(d);
                            }}
                            className={`py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              onlineRoom.difficulty === d
                                ? 'bg-[#1ab783] text-[#022c22] border-[#1ab783] shadow-[0_0_12px_rgba(26,183,131,0.4)]'
                                : 'bg-[#111413] text-[#89938f] border-[#27302c] hover:text-[#e1e3e0]'
                            }`}
                          >
                            {DIFFICULTY_SETTINGS[d].namePt}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Toggle: Quem seleciona o tipo no lobby */}
                    <div className="w-full mt-2.5 py-2 px-3 bg-[#111413] border border-[#27302c] rounded-2xl flex items-center justify-between">
                      <div className="flex flex-col text-left">
                        <span className="text-[11px] font-bold text-[#e1e3e0] flex items-center gap-1.5">
                          <span>Seleção de tipo:</span>
                          <span
                            className={
                              onlineRoom.playerSelectsType !== false
                                ? 'text-[#1ab783]'
                                : 'text-amber-400'
                            }
                          >
                            {onlineRoom.playerSelectsType !== false
                              ? 'Jogador (Padrão)'
                              : 'CPU Aleatório'}
                          </span>
                        </span>
                        <span className="text-[9px] text-[#89938f]">
                          {onlineRoom.playerSelectsType !== false
                            ? 'Grid 6x3: 1 ou 2 tipos'
                            : 'Sorteio pela CPU'}
                        </span>
                      </div>

                      {isHostOnline && (
                        <button
                          type="button"
                          onClick={() => {
                            soundManager.playButtonClick();
                            onSetOnlineSettings?.({
                              playerSelectsType:
                                onlineRoom.playerSelectsType === false ? true : false,
                            });
                          }}
                          className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer ${
                            onlineRoom.playerSelectsType !== false
                              ? 'bg-[#1ab783]'
                              : 'bg-[#27302c]'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full transition-transform ${
                              onlineRoom.playerSelectsType !== false
                                ? 'translate-x-5 bg-[#022c22]'
                                : 'translate-x-0 bg-[#89938f]'
                            }`}
                          />
                        </button>
                      )}
                    </div>

                    {/* Config: Quantos jogadores escolhem (Default 2) */}
                    {onlineRoom.playerSelectsType !== false && (
                      <div className="w-full mt-2 py-2 px-3 bg-[#111413] border border-[#27302c] rounded-2xl flex flex-col gap-1.5 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[#e1e3e0]">
                            Quantos jogadores escolhem:
                          </span>
                          <span className="text-[11px] font-black text-[#1ab783]">
                            {onlineRoom.numTypeSelectors || 2}{' '}
                            {(onlineRoom.numTypeSelectors || 2) === 2 ? '(Padrão)' : ''}
                          </span>
                        </div>
                        <span className="text-[9px] text-[#89938f]">
                          Cada jogador poderá escolher 1 tipo para a rodada
                        </span>
                        {isHostOnline && (
                          <div className="grid grid-cols-4 gap-1 pt-1 border-t border-[#27302c]">
                            {[1, 2, 3, 4].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => {
                                  soundManager.playButtonClick();
                                  onSetOnlineSettings?.({ numTypeSelectors: n });
                                }}
                                className={`py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                                  (onlineRoom.numTypeSelectors || 2) === n
                                    ? 'bg-[#1ab783] text-[#022c22] border-[#1ab783] shadow-[0_0_10px_rgba(26,183,131,0.4)]'
                                    : 'bg-[#1b201e] text-[#a0aba5] border-[#27302c] hover:border-[#3d4542]'
                                }`}
                              >
                                {n} {n === 2 ? '★' : ''}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Connected players list */}
                  <div className="w-full space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                    <div className="text-left text-[10px] font-bold text-[#89938f] uppercase tracking-wider mb-1">
                      Jogadores Conectados ({onlineRoom.players?.length || 0}):
                    </div>
                    {onlineRoom.players?.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between bg-[#1b201e] px-3.5 py-2 rounded-xl border border-[#27302c] text-xs font-semibold"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full border border-white/20 shadow-xs"
                            style={{ backgroundColor: p.color }}
                          />
                          <span className="text-[#e1e3e0] font-bold">{p.name}</span>
                          {p.id === myPlayerId && (
                            <span className="text-[10px] text-[#89938f] font-normal">(Você)</span>
                          )}
                        </div>

                        {p.isHost && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                            <Crown className="w-3 h-3 text-amber-400" />
                            <span>Anfitrião</span>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Start Game Action */}
                  <div className="w-full pt-1">
                    {isHostOnline ? (
                      <M3ButtonFromCanvas
                        controlResult={m3Controls.iniciarPartida}
                        onClick={() => {
                          soundManager.playButtonClick();
                          onStartOnlineGame?.();
                        }}
                      />
                    ) : (
                      <div className="py-2.5 text-center text-xs text-[#1ab783] animate-pulse font-medium bg-[#1ab783]/10 border border-[#1ab783]/30 rounded-2xl">
                        Aguardando o anfitrião iniciar a partida...
                      </div>
                    )}
                  </div>

                  {/* Leave Room Button */}
                  <div className="w-full pt-0.5">
                    <button
                      onClick={() => {
                        soundManager.playButtonClick();
                        onLeaveRoom?.();
                      }}
                      className="w-full py-2.5 rounded-2xl bg-[#1b201e] hover:bg-[#222725] border border-[#27302c] text-[#a0aba5] hover:text-white font-bold text-xs uppercase cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-400" />
                      <span>Sair da Sala</span>
                    </button>
                  </div>
                </motion.div>
              ) : activeSubmenu === 'root' ? (
                /* =================================================== */
                /* CASE 2: ROOT MENU (MULTIPLAYER & SINGLEPLAYER)      */
                /* =================================================== */
                <motion.div
                  key="root-menu"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                  className="w-full flex flex-col gap-4"
                >
                  {/* M3: MULTIPLAYER (filled-button sprite) */}
                  <div
                    className="w-full cursor-pointer select-none"
                    onMouseEnter={() => setMpHovered(true)}
                    onMouseLeave={() => {
                      setMpHovered(false);
                      setMpPressed(false);
                    }}
                    onMouseDown={() => setMpPressed(true)}
                    onMouseUp={() => setMpPressed(false)}
                    onClick={(e) => {
                      e.stopPropagation();
                      soundManager.playButtonClick();
                      setActiveSubmenu('multiplayer');
                    }}
                  >
                    <img
                      src={
                        mpPressed
                          ? asset('assets/m3_multiplayer_pressed.png')
                          : mpHovered
                            ? asset('assets/m3_multiplayer_hovered.png')
                            : asset('assets/m3_multiplayer_normal.png')
                      }
                      alt="MULTIPLAYER"
                      className="w-full h-auto object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] hover:brightness-105 active:scale-[0.98] transition-all"
                    />
                  </div>

                  {/* M3: SINGLEPLAYER (elevated-button sprite) */}
                  <div
                    className="w-full cursor-pointer select-none"
                    onMouseEnter={() => setSpHovered(true)}
                    onMouseLeave={() => {
                      setSpHovered(false);
                      setSpPressed(false);
                    }}
                    onMouseDown={() => setSpPressed(true)}
                    onMouseUp={() => setSpPressed(false)}
                    onClick={(e) => {
                      e.stopPropagation();
                      soundManager.playButtonClick();
                      setActiveSubmenu('difficulty');
                    }}
                  >
                    <img
                      src={
                        spPressed
                          ? asset('assets/m3_singleplayer_pressed.png')
                          : spHovered
                            ? asset('assets/m3_singleplayer_hovered.png')
                            : asset('assets/m3_singleplayer_normal.png')
                      }
                      alt="SINGLEPLAYER"
                      className="w-full h-auto object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] hover:brightness-105 active:scale-[0.98] transition-all"
                    />
                  </div>
                </motion.div>
              ) : activeSubmenu === 'difficulty' ? (
                /* =================================================== */
                /* CASE 3: DIFFICULTY BUTTONS (ACCENT #1ab783)         */
                /* =================================================== */
                <motion.div
                  key="difficulty-menu"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                  className="w-full flex flex-col gap-3.5 items-center"
                >
                  <div className="text-center mb-1">
                    <span className="font-black text-sm uppercase tracking-widest text-[#1ab783] drop-shadow-[0_0_12px_rgba(26,183,131,0.6)]">
                      Escolha a Dificuldade
                    </span>
                  </div>

                  {/* FÁCIL Button */}
                  <M3ButtonFromCanvas
                    controlResult={m3Controls.facil}
                    onClick={() => {
                      soundManager.playButtonClick();
                      onStartSolo('easy');
                    }}
                  />

                  {/* MÉDIO Button */}
                  <M3ButtonFromCanvas
                    controlResult={m3Controls.medio}
                    onClick={() => {
                      soundManager.playButtonClick();
                      onStartSolo('medium');
                    }}
                  />

                  {/* DIFÍCIL Button */}
                  <M3ButtonFromCanvas
                    controlResult={m3Controls.dificil}
                    onClick={() => {
                      soundManager.playButtonClick();
                      onStartSolo('hard');
                    }}
                  />

                  {/* VOLTAR Button */}
                  <div className="w-full pt-1">
                    <M3ButtonFromCanvas
                      controlResult={m3Controls.voltar}
                      onClick={() => {
                        soundManager.playButtonClick();
                        setActiveSubmenu('root');
                      }}
                    />
                  </div>
                </motion.div>
              ) : (
                /* =================================================== */
                /* CASE 4: MULTIPLAYER CREATE / JOIN FORM              */
                /* =================================================== */
                <motion.div
                  key="multiplayer-menu"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                  className="w-full flex flex-col gap-3 items-center"
                >
                  <div className="text-center mb-0.5">
                    <span className="font-black text-sm uppercase tracking-widest text-[#1ab783] drop-shadow-[0_0_12px_rgba(26,183,131,0.6)]">
                      Multiplayer Online
                    </span>
                  </div>

                  {/* Player Name Input */}
                  <div className="w-full px-1">
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => onPlayerNameChange(e.target.value)}
                      placeholder="Seu Apelido..."
                      maxLength={14}
                      className="w-full py-2.5 px-4 bg-[#1b201e] border-2 border-[#27302c] focus:border-[#1ab783] rounded-full text-center text-[#e1e3e0] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#1ab783]/40 shadow-inner"
                    />
                  </div>

                  {/* Difficulty selector for the room */}
                  <div className="flex gap-2 justify-center w-full px-1">
                    {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          soundManager.playButtonClick();
                          setMpDifficulty(d);
                        }}
                        className={`flex-1 py-2 px-3 rounded-full text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                          mpDifficulty === d
                            ? 'bg-[#1ab783] text-[#022c22] border-[#1ab783] shadow-[0_0_15px_rgba(26,183,131,0.5)]'
                            : 'bg-[#1b201e] text-[#a0aba5] border-[#27302c] hover:border-[#3d4542]'
                        }`}
                      >
                        {d === 'easy' ? 'Fácil' : d === 'medium' ? 'Médio' : 'Difícil'}
                      </button>
                    ))}
                  </div>

                  {/* Toggle: Jogador Seleciona o Tipo (Padrão) vs CPU Sorteia */}
                  <div className="w-full px-1">
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playButtonClick();
                        setPlayerSelectsType((prev) => !prev);
                      }}
                      className="w-full py-2 px-3 bg-[#1b201e] border border-[#27302c] hover:border-[#1ab783]/50 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[#e1e3e0] flex items-center gap-1.5">
                          <span>Quem escolhe o tipo:</span>
                          <span className={playerSelectsType ? 'text-[#1ab783]' : 'text-amber-400'}>
                            {playerSelectsType ? 'Jogador (Padrão)' : 'CPU Aleatório'}
                          </span>
                        </span>
                        <span className="text-[10px] text-[#89938f]">
                          {playerSelectsType
                            ? 'Jogadores escolhem os tipos em grid 6x3'
                            : 'A CPU sorteia o tipo aleatoriamente'}
                        </span>
                      </div>

                      {/* Toggle Switch */}
                      <div
                        className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                          playerSelectsType ? 'bg-[#1ab783]' : 'bg-[#27302c]'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full shadow-md transition-transform ${
                            playerSelectsType ? 'translate-x-5 bg-[#022c22]' : 'translate-x-0 bg-[#89938f]'
                          }`}
                        />
                      </div>
                    </button>
                  </div>

                  {/* Config: Quantos jogadores escolhem (Default 2) */}
                  {playerSelectsType && (
                    <div className="w-full px-1">
                      <div className="w-full py-2 px-3 bg-[#1b201e] border border-[#27302c] rounded-2xl flex flex-col gap-1.5 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#e1e3e0]">
                            Quantos jogadores escolhem:
                          </span>
                          <span className="text-xs font-black text-[#1ab783]">
                            {numTypeSelectors} {numTypeSelectors === 2 ? '(Padrão)' : ''}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#89938f]">
                          Cada jogador poderá escolher 1 tipo para a rodada
                        </span>
                        <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-[#27302c]/60">
                          {[1, 2, 3, 4].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => {
                                soundManager.playButtonClick();
                                setNumTypeSelectors(n);
                              }}
                              className={`py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                numTypeSelectors === n
                                  ? 'bg-[#1ab783] text-[#022c22] border-[#1ab783] shadow-[0_0_10px_rgba(26,183,131,0.4)]'
                                  : 'bg-[#111413] text-[#a0aba5] border-[#27302c] hover:border-[#3d4542]'
                              }`}
                            >
                              {n} {n === 2 ? '★' : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Criar Sala Button */}
                  <M3ButtonFromCanvas
                    controlResult={m3Controls.criarSala}
                    onClick={() => {
                      soundManager.playButtonClick();
                      onStartMultiplayerCreate(mpDifficulty, playerSelectsType, numTypeSelectors);
                    }}
                  />

                  {/* Entrar com código */}
                  <div className="w-full flex gap-2 px-1">
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="CÓDIGO"
                      maxLength={6}
                      className="w-32 py-2.5 px-3 bg-[#1b201e] border-2 border-[#27302c] rounded-full text-center text-[#e1e3e0] font-mono text-sm font-bold focus:outline-none focus:border-[#1ab783]"
                    />
                    <button
                      type="button"
                      disabled={!joinCode.trim()}
                      onClick={() => {
                        soundManager.playButtonClick();
                        onStartMultiplayerJoin(joinCode.trim());
                      }}
                      className="flex-1 py-2.5 px-4 rounded-full bg-[#1ab783] hover:bg-[#20c992] disabled:opacity-40 text-[#022c22] font-black text-sm uppercase cursor-pointer transition-all shadow-[0_0_18px_rgba(26,183,131,0.4)] active:scale-95"
                    >
                      Entrar
                    </button>
                  </div>

                  {/* VOLTAR Button */}
                  <div className="w-full pt-1">
                    <M3ButtonFromCanvas
                      controlResult={m3Controls.voltar}
                      onClick={() => {
                        soundManager.playButtonClick();
                        setActiveSubmenu('root');
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
  );

  // 1. In Playing mode: Full viewport responsive container with scroll
  if (isPlaying && gameContent) {
    return (
      <div
        className="fixed inset-0 w-full h-full min-h-screen overflow-y-auto text-[#e1e3e0] select-none flex flex-col justify-between p-2 sm:p-4 z-40 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${asset('assets/BG.png')}')` }}
      >
        <motion.div
          key="slide-playing-game-stage"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full h-full min-h-0 flex flex-col justify-between flex-1"
        >
          {gameContent}
        </motion.div>
      </div>
    );
  }

  // 2. Mobile vertical / horizontal or small PC windows (isCompact)
  if (isCompact) {
    if (isSlide1) {
      return (
        <div
          className="fixed inset-0 w-full h-full min-h-screen overflow-y-auto text-[#e1e3e0] select-none flex flex-col items-center justify-center p-4 cursor-pointer z-40 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${asset('assets/BG.png')}')` }}
          onClick={handleStartClick}
        >
          <div className="w-full max-w-sm flex flex-col items-center justify-center my-auto">
            <img
              src={asset('assets/Poke.png')}
              alt="Pokéball"
              className="w-[65vw] max-w-[280px] max-h-[35vh] h-auto object-contain pointer-events-none drop-shadow-2xl opacity-90"
            />
            <img
              src={asset('assets/Text.png')}
              alt="Poke Types Logo"
              className="w-[85vw] max-w-[340px] max-h-[25vh] h-auto object-contain pointer-events-none drop-shadow-2xl -mt-6 sm:-mt-8"
            />
            <div className="mt-6 px-6 py-2.5 rounded-full bg-[#1ab783] text-[#022c22] font-black text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(26,183,131,0.5)] active:scale-95 transition-transform animate-pulse">
              Toque para Iniciar
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className="fixed inset-0 w-full h-full min-h-screen overflow-y-auto text-[#e1e3e0] select-none flex flex-col items-center justify-start sm:justify-center p-3 sm:p-5 z-40 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${asset('assets/BG.png')}')` }}
      >
        <div className="w-full max-w-[440px] mx-auto flex flex-col items-center gap-3 my-auto pb-8">
          <img
            src={asset('assets/Text.png')}
            alt="Poke Types Logo"
            onClick={handleBackToSlide1}
            className="w-[60vw] max-w-[240px] sm:max-w-[280px] h-auto object-contain mx-auto mb-1 drop-shadow-md cursor-pointer shrink-0"
            title="Voltar à tela inicial"
          />

          <div className="w-full">{renderSubmenuContent()}</div>

          {activeSubmenu === 'root' && !onlineRoom && (
            <button
              onClick={handleBackToSlide1}
              className="mt-1 px-4 py-1.5 rounded-full bg-[#1b201e]/80 hover:bg-[#222725] border border-[#27302c] text-[#a0aba5] hover:text-[#e1e3e0] font-mono text-xs cursor-pointer flex items-center gap-1.5 backdrop-blur-xs transition-all active:scale-95"
              title="Voltar à tela inicial"
            >
              <span>← Tela Inicial</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. Desktop Widescreen: Exact 1365x768 16:9 Canvas Stage with Match Move
  return (
    <div
      className="fixed inset-0 w-screen h-screen overflow-hidden text-[#e1e3e0] select-none flex items-center justify-center cursor-default z-40 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url('${asset('assets/BG.png')}')`,
      }}
      onClick={isSlide1 && !isPlaying ? handleStartClick : undefined}
    >
      {/* Exact 1365x768 16:9 Fullscreen Canvas Stage with Material You Dark Theme */}
      <div
        className="relative overflow-visible"
        style={{
          width: '100vw',
          height: '100vh',
          maxWidth: 'calc(100vh * (1365 / 768))',
          maxHeight: 'calc(100vw * (768 / 1365))',
          aspectRatio: '1365 / 768',
        }}
      >
        {/* Background layer with BG.png across all parts */}
        <div
          className="absolute inset-0 w-full h-full pointer-events-none z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${asset('assets/BG.png')}')` }}
        />

        {/* LAYER 1: "Poke" (Pokébola) Exact Poke.png sprite */}
        <motion.div
          className="absolute pointer-events-none z-10"
          initial={false}
          animate={
            isSlide1
              ? {
                  left: '-0.3%',
                  top: '-0.8%',
                  width: '100.5%',
                  height: '100.7%',
                  opacity: 1,
                  scale: 1,
                }
              : {
                  left: '73.3%',
                  top: '-0.8%',
                  width: '99.9%',
                  height: '100.6%',
                  opacity: 0,
                  scale: 0.96,
                }
          }
          transition={{
            duration: 0.65,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <img
            src={asset('assets/Poke.png')}
            alt="Pokéball"
            className="w-full h-full object-fill pointer-events-none"
          />
        </motion.div>

        {/* LAYER 2: "Text" (Poke Types) Exact Text.png sprite */}
        <motion.div
          className="absolute pointer-events-none z-20"
          initial={false}
          animate={
            isSlide1
              ? {
                  left: '0.1%',
                  top: '-0.8%',
                  width: '99.6%',
                  height: '100.4%',
                  opacity: 1,
                  scale: 1,
                }
              : isPlaying
              ? {
                  left: '-73.3%',
                  top: '-0.8%',
                  width: '100.4%',
                  height: '100.3%',
                  opacity: 0,
                  scale: 0.96,
                }
              : {
                  left: '-1.5%',
                  top: '-0.8%',
                  width: '100.4%',
                  height: '100.3%',
                  opacity: 1,
                  scale: 1,
                }
          }
          transition={{
            duration: 0.65,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <img
            src={asset('assets/Text.png')}
            alt="Poke Types Logo"
            className="w-full h-full object-fill pointer-events-none"
          />
        </motion.div>

        {/* SLIDE 2: INTERACTIVE BUTTONS & LOBBY ON SCREEN */}
        {!isSlide1 && !isPlaying && (
          <div
            style={{
              left: activeSubmenu === 'root' && !onlineRoom ? '58.5%' : '54%',
              top: activeSubmenu === 'root' && !onlineRoom ? '36.5%' : onlineRoom ? '14%' : '18%',
              width: activeSubmenu === 'root' && !onlineRoom ? '37%' : '44%',
            }}
            className="absolute z-30 flex flex-col items-center gap-3 transition-all duration-300 max-h-[90vh] overflow-y-auto pr-1"
          >
            {renderSubmenuContent()}

            {/* Back button to return to Slide 1 */}
            {activeSubmenu === 'root' && !onlineRoom && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                onClick={handleBackToSlide1}
                className="mt-2 px-4 py-1.5 rounded-full bg-[#1b201e]/80 hover:bg-[#222725] border border-[#27302c] text-[#a0aba5] hover:text-[#e1e3e0] font-mono text-xs cursor-pointer flex items-center gap-1.5 backdrop-blur-xs transition-all active:scale-95"
                title="Voltar à tela de início"
              >
                <span>← Tela Inicial</span>
              </motion.button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
