import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TallyMark } from './TallyMark';
import { PlayerState, GameMode, RoundGuess, CompactPokemon } from '../types/game';
import { soundManager } from '../utils/audio';
import { renderMaterial3Control, M3RenderResult } from '../utils/material3Renderer';
import { POKEMON_TYPES } from '../data/typesInfo';
import { asset } from '../utils/asset';
import { formatPokemonName, getPokemonSprite } from '../utils/pokemonApi';

interface NotebookModalProps {
  isOpen: boolean;
  gameMode: GameMode;
  players: PlayerState[];
  activePlayerId?: string | number;
  lastScoredPlayerId: string | number | null;
  onNextRound: () => void;
  isGameWon?: boolean;
  winnerPlayer?: PlayerState | null;
  onClose?: () => void;
  lastRoundGuesses?: Record<string, RoundGuess> | null;
  soloLastPokemon?: CompactPokemon | null;
}

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
      className={`cursor-pointer select-none transition-transform duration-150 active:scale-[0.98] ${className}`}
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

export const NotebookModal: React.FC<NotebookModalProps> = ({
  isOpen,
  gameMode,
  players,
  lastScoredPlayerId,
  onNextRound,
  isGameWon = false,
  winnerPlayer = null,
  onClose,
  lastRoundGuesses,
  soloLastPokemon,
}) => {
  useEffect(() => {
    if (isOpen) {
      soundManager.playNotebookSwoosh();
    }
  }, [isOpen]);

  // Support Space or Enter to proceed, Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose && !isGameWon) {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onNextRound();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onNextRound, onClose, isGameWon]);

  // Rendered with Material Renderer without gradient and without "(Enter ou Espaço)"
  const nextBtnControl = useMemo(() => {
    return renderMaterial3Control({
      type: 'filled-button',
      label: isGameWon ? 'JOGAR NOVAMENTE' : 'PRÓXIMA RODADA',
      primaryColor: '#1ab783',
      onPrimaryColor: '#022c22',
      surfaceColor: '#1b201e',
      onSurfaceColor: '#e1e3e0',
      customRadius: 32,
      width: 360,
      height: 64,
    });
  }, [isGameWon]);

  const getGridClasses = () => {
    if (players.length <= 1) return 'flex flex-col items-center justify-center';
    if (players.length === 2) return 'grid grid-cols-2 gap-4 sm:gap-8 divide-x divide-slate-300/80';
    if (players.length === 3) return 'grid grid-cols-3 gap-3 divide-x divide-slate-300/80';
    return 'grid grid-cols-2 sm:grid-cols-4 gap-3 divide-slate-300/80';
  };

  const getTallySize = () => {
    if (players.length <= 1) return 160;
    if (players.length === 2) return 130;
    return 105;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-start sm:justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
          {/* Animated Authentic Notebook */}
          <motion.div
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 200 }}
            className="w-full max-w-3xl relative select-none my-auto"
          >
            {/* Top Spiral Wire Binding */}
            <div className="relative z-20 flex justify-evenly px-4 sm:px-12 -mb-3 sm:-mb-4">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div
                    className="w-3 sm:w-4 h-8 sm:h-11 rounded-full border-2 border-slate-500 shadow-md transform -rotate-6"
                    style={{
                      background: 'linear-gradient(135deg, #cbd5e1 0%, #64748b 50%, #1e293b 100%)',
                    }}
                  />
                  <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 -mt-2 bg-slate-900/80 rounded-full shadow-inner" />
                </div>
              ))}
            </div>

            {/* Notebook Paper Sheet */}
            <div
              className="relative z-10 w-full rounded-2xl sm:rounded-3xl shadow-2xl border border-[#d6cfbe] pt-7 sm:pt-10 pb-5 sm:pb-6 px-3 sm:px-8 text-slate-900 overflow-hidden"
              style={{
                backgroundColor: '#fbf8ee',
                backgroundImage: `
                  linear-gradient(to right, transparent 52px, #f8717155 53px, transparent 55px),
                  repeating-linear-gradient(to bottom, transparent, transparent 27px, #94a3b833 28px)
                `,
                backgroundPosition: '0 0, 0 34px',
                boxShadow:
                  '0 20px 40px -10px rgba(0, 0, 0, 0.5), inset 0 0 40px rgba(220, 210, 190, 0.4)',
                fontFamily: "'Architects Daughter', cursive, sans-serif",
              }}
            >
              {isGameWon && (
                <div className="text-center mb-3">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-red-700">
                    {winnerPlayer?.name || 'Vencedor'} venceu o jogo!
                  </h2>
                </div>
              )}

              {/* Mobile scroll hint if 3 or more players */}
              {players.length >= 3 && (
                <div className="text-center text-[11px] sm:text-xs text-slate-500 font-sans mb-1.5 md:hidden">
                  ← Deslize para ver todos os {players.length} jogadores →
                </div>
              )}

              {/* Scrollable Player Columns Container (Ensures 4 players are cleanly displayed with scroll) */}
              <div className="w-full overflow-x-auto pb-3 pt-1 px-1 -mx-1 scroll-smooth">
                <div
                  className={`flex items-start ${
                    players.length <= 2 ? 'justify-center' : 'justify-start md:justify-center'
                  } gap-3 sm:gap-6 min-w-max mx-auto divide-x divide-slate-300/80`}
                >
                  {players.map((p) => {
                    const didJustScore = lastScoredPlayerId === p.id;
                    const isWinner = winnerPlayer?.id === p.id;

                    // Find pokemon guessed by this player
                    let guessedPokemon: CompactPokemon | null = null;
                    if (gameMode === 'online' && lastRoundGuesses && lastRoundGuesses[p.id]) {
                      guessedPokemon = lastRoundGuesses[p.id].pokemon;
                    } else if (p.records.length > 0) {
                      guessedPokemon = p.records[p.records.length - 1].pokemon;
                    } else if (gameMode === 'solo' && soloLastPokemon) {
                      guessedPokemon = soloLastPokemon;
                    }

                    return (
                      <div
                        key={p.id}
                        className={`flex flex-col items-center px-3 sm:px-5 py-2 ${
                          players.length <= 2
                            ? 'min-w-[150px] sm:min-w-[180px]'
                            : 'min-w-[130px] sm:min-w-[150px] max-w-[180px]'
                        } shrink-0 ${
                          didJustScore && !isGameWon ? 'bg-amber-100/35 rounded-xl' : ''
                        }`}
                      >
                        {/* Clean name */}
                        <div className="text-base sm:text-lg font-bold text-slate-800 mb-0.5 truncate max-w-[140px] text-center">
                          {p.name}
                        </div>

                        {isWinner ? (
                          <div className="text-xs font-bold text-red-600 mb-1">
                            Vencedor
                          </div>
                        ) : didJustScore && !isGameWon ? (
                          <div className="text-xs font-bold text-emerald-700 mb-1">
                            Ponto na Rodada
                          </div>
                        ) : null}

                        {/* Tally Mark Count */}
                        <TallyMark
                          score={p.score}
                          animateNewStroke={didJustScore}
                          size={getTallySize()}
                        />

                        {/* Guessed Pokémon: Clean Name without "#1", with 2 elements/types if pokemon has 2 */}
                        {guessedPokemon && (
                          <div className="mt-2.5 flex flex-col items-center pt-2 border-t border-slate-300/60 w-full">
                            <img
                              src={getPokemonSprite(guessedPokemon.id)}
                              alt={guessedPokemon.name}
                              className="w-12 h-12 sm:w-14 sm:h-14 object-contain filter drop-shadow-sm"
                            />
                            {/* Minimal name without "#1 Onix" */}
                            <div className="text-xs sm:text-sm font-bold text-slate-800 text-center truncate max-w-[130px]">
                              {formatPokemonName(guessedPokemon.name)}
                            </div>

                            {/* Pokemon Elements: shows 2 elements if pokemon has 2 types */}
                            <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                              {guessedPokemon.types.map((typeId) => {
                                const typeInfo = POKEMON_TYPES[typeId];
                                return (
                                  <div
                                    key={typeId}
                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white shadow-xs"
                                    style={{ backgroundColor: typeInfo?.color || '#64748b' }}
                                  >
                                    <img
                                      src={asset(`assets/types/${typeId}.svg`)}
                                      alt={typeInfo?.namePt || typeId}
                                      className="w-3 h-3 object-contain"
                                    />
                                    <span>{typeInfo?.namePt || typeId}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Rendered using Material 3 Renderer without gradient or parentheses */}
          <div className="w-full max-w-sm flex justify-center mt-3 sm:mt-4 relative z-30 pb-2">
            <M3ButtonFromCanvas
              controlResult={nextBtnControl}
              onClick={onNextRound}
              className="w-full max-w-xs"
            />
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
