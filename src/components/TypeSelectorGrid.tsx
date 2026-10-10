import React, { useState, useMemo } from 'react';
import { PokemonTypeId } from '../types/game';
import { POKEMON_TYPES } from '../data/typesInfo';
import { asset } from '../utils/asset';
import { getValidCombiningTypes } from '../utils/pokemonApi';
import { soundManager } from '../utils/audio';
import { Check, Sparkles } from 'lucide-react';

interface TypeSelectorGridProps {
  onConfirmSelection: (types: PokemonTypeId[]) => void;
  maxDexId?: number;
  selectorPlayerName?: string;
  selectorPlayerNames?: string[];
  isMyTurn: boolean;
  hasSubmitted?: boolean;
  totalSelectors?: number;
}

const ORDERED_TYPES: PokemonTypeId[] = [
  'normal',
  'fire',
  'water',
  'grass',
  'electric',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'steel',
  'dark',
  'fairy',
];

export const TypeSelectorGrid: React.FC<TypeSelectorGridProps> = ({
  onConfirmSelection,
  maxDexId = 1025,
  selectorPlayerName = 'Jogador',
  selectorPlayerNames,
  isMyTurn,
  hasSubmitted = false,
  totalSelectors = 1,
}) => {
  const [selectedTypes, setSelectedTypes] = useState<PokemonTypeId[]>([]);

  const singleOnly = totalSelectors >= 2;

  // Compute combining types when exactly 1 type is selected (in single-selector mode)
  const validCombining = useMemo(() => {
    if (singleOnly || selectedTypes.length !== 1) {
      return new Set<PokemonTypeId>();
    }
    return getValidCombiningTypes(selectedTypes[0], maxDexId);
  }, [singleOnly, selectedTypes, maxDexId]);

  const handleToggleType = (typeId: PokemonTypeId) => {
    if (!isMyTurn || hasSubmitted) return;

    if (singleOnly) {
      soundManager.playButtonClick();
      if (selectedTypes.includes(typeId)) {
        setSelectedTypes([]);
      } else {
        setSelectedTypes([typeId]);
      }
      return;
    }

    if (selectedTypes.includes(typeId)) {
      // Deselect
      soundManager.playButtonClick();
      setSelectedTypes((prev) => prev.filter((t) => t !== typeId));
      return;
    }

    if (selectedTypes.length === 0) {
      // First selection
      soundManager.playButtonClick();
      setSelectedTypes([typeId]);
      return;
    }

    if (selectedTypes.length === 1) {
      // Second selection - only allowed if combination exists
      if (validCombining.has(typeId)) {
        soundManager.playButtonClick();
        setSelectedTypes((prev) => [...prev, typeId]);
      }
      return;
    }
  };

  const handleConfirm = () => {
    if (selectedTypes.length === 0 || !isMyTurn || hasSubmitted) return;
    soundManager.playTypeSelected();
    onConfirmSelection(selectedTypes);
  };

  // Case 1: Player is not in the selector group this round
  if (!isMyTurn) {
    const namesText =
      selectorPlayerNames && selectorPlayerNames.length > 0
        ? selectorPlayerNames.join(', ')
        : selectorPlayerName;
    const isPlural = (selectorPlayerNames?.length ?? 1) > 1;

    return (
      <div className="w-full max-w-xl mx-auto p-6 sm:p-8 bg-[#151918]/90 border-2 border-[#27302c] rounded-3xl backdrop-blur-md shadow-2xl flex flex-col items-center justify-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[#1ab783]/10 border border-[#1ab783]/30 flex items-center justify-center text-3xl animate-pulse">
          🎯
        </div>
        <div>
          <h3 className="text-lg sm:text-xl font-black text-[#e1e3e0] uppercase tracking-wide">
            Aguardando Seleção de Tipo
          </h3>
          <p className="text-xs sm:text-sm text-[#89938f] mt-1">
            <span className="text-[#1ab783] font-bold">{namesText}</span>{' '}
            {isPlural
              ? 'estão escolhendo os tipos da rodada...'
              : 'está escolhendo o tipo da rodada...'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#89938f] font-mono mt-2">
          <span className="w-2 h-2 rounded-full bg-[#1ab783] animate-ping" />
          <span>A partida iniciará assim que os tipos forem confirmados</span>
        </div>
      </div>
    );
  }

  // Case 2: Player is a selector, but has already submitted their choice
  if (hasSubmitted) {
    return (
      <div className="w-full max-w-xl mx-auto p-6 sm:p-8 bg-[#151918]/90 border-2 border-[#27302c] rounded-3xl backdrop-blur-md shadow-2xl flex flex-col items-center justify-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[#1ab783]/15 border border-[#1ab783]/40 flex items-center justify-center text-3xl">
          ✅
        </div>
        <div>
          <h3 className="text-lg sm:text-xl font-black text-[#e1e3e0] uppercase tracking-wide">
            Tipo Escolhido!
          </h3>
          <p className="text-xs sm:text-sm text-[#89938f] mt-1">
            Aguardando os outros jogadores escolherem para iniciar a rodada...
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#89938f] font-mono mt-2">
          <span className="w-2 h-2 rounded-full bg-[#1ab783] animate-ping" />
          <span>A rodada iniciará automaticamente</span>
        </div>
      </div>
    );
  }

  // Case 3: Player's turn to pick
  return (
    <div className="w-full max-w-2xl mx-auto p-2.5 sm:p-5 bg-[#151918]/95 border-2 border-[#27302c] rounded-2xl sm:rounded-3xl backdrop-blur-md shadow-2xl flex flex-col items-center gap-2.5 sm:gap-3 max-h-[85vh] overflow-y-auto">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-1.5 text-[#1ab783] font-black text-xs sm:text-sm uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-[#1ab783]" />
          <span>Sua Vez de Escolher o Tipo</span>
        </div>
        <p className="text-[10px] sm:text-xs text-[#89938f] mt-0.5">
          {singleOnly
            ? 'Selecione 1 tipo para a rodada'
            : 'Selecione 1 tipo único ou combine 2 tipos para desafiar o oponente'}
        </p>
      </div>

      {/* 6x3 Grid of All 18 Pokemon Types */}
      <div className="w-full grid grid-cols-6 grid-rows-3 gap-1 sm:gap-2">
        {ORDERED_TYPES.map((tId) => {
          const info = POKEMON_TYPES[tId];
          const isSelected = selectedTypes.includes(tId);

          let isDisabled = false;
          let isGreyedOut = false;

          if (!singleOnly) {
            const isFirstSelection = selectedTypes.length === 1;
            isGreyedOut = isFirstSelection && !isSelected && !validCombining.has(tId);
            const isInactive = selectedTypes.length === 2 && !isSelected;
            isDisabled = isGreyedOut || isInactive;
          }

          return (
            <button
              key={tId}
              type="button"
              disabled={isDisabled}
              onClick={() => handleToggleType(tId)}
              title={
                isGreyedOut
                  ? `Não existe nenhum Pokémon de ${POKEMON_TYPES[selectedTypes[0]]?.namePt} + ${info.namePt}`
                  : info.namePt
              }
              className={`relative flex flex-col items-center justify-center py-1.5 sm:py-2 px-0.5 sm:px-1 rounded-xl sm:rounded-2xl border transition-all cursor-pointer select-none ${
                isSelected
                  ? 'border-white shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105 z-10'
                  : isDisabled
                    ? 'opacity-25 grayscale cursor-not-allowed border-[#1f2523] bg-[#111413]'
                    : 'border-[#27302c] bg-[#1b201e] hover:border-white/40 hover:bg-[#222725] active:scale-95'
              }`}
              style={{
                backgroundColor: isSelected ? info.color : undefined,
              }}
            >
              {/* Type SVG Icon */}
              <div
                className={`w-6 h-6 sm:w-9 sm:h-9 rounded-full flex items-center justify-center p-0.5 sm:p-1.5 mb-0.5 sm:mb-1 transition-all ${
                  isSelected ? 'bg-black/30' : 'shadow-inner'
                }`}
                style={{ backgroundColor: !isSelected ? info.color : undefined }}
              >
                <img
                  src={asset(`assets/types/${tId}.svg`)}
                  alt={info.namePt}
                  className="w-full h-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] select-none pointer-events-none"
                />
              </div>

              {/* Type Name */}
              <span
                className={`text-[8px] sm:text-[11px] font-black uppercase tracking-tight text-center leading-none truncate max-w-full px-0.5 ${
                  isSelected
                    ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
                    : 'text-[#c0cac4]'
                }`}
              >
                {info.namePt}
              </span>

              {/* Selection Badge Checkmark */}
              {isSelected && (
                <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-white text-black rounded-full flex items-center justify-center shadow-md">
                  <Check className="w-2 h-2 sm:w-2.5 sm:h-2.5 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Preview & Action Bar */}
      <div className="w-full flex items-center justify-between gap-3 pt-2 border-t border-[#27302c]">
        {/* Selected Summary */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] sm:text-xs text-[#89938f] font-semibold uppercase">
            Selecionado:
          </span>
          {selectedTypes.length === 0 ? (
            <span className="text-xs text-[#89938f] italic">Nenhum</span>
          ) : (
            <div className="flex items-center gap-1.5">
              {selectedTypes.map((tId) => (
                <span
                  key={tId}
                  className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold text-white shadow-xs border border-white/20"
                  style={{ backgroundColor: POKEMON_TYPES[tId]?.color }}
                >
                  {POKEMON_TYPES[tId]?.namePt}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Escolher Button - Activates when >= 1 type selected */}
        <button
          type="button"
          disabled={selectedTypes.length === 0}
          onClick={handleConfirm}
          className={`py-2 px-5 sm:px-6 rounded-full font-black text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedTypes.length > 0
              ? 'bg-[#1ab783] hover:bg-[#20c992] text-[#022c22] shadow-[0_0_20px_rgba(26,183,131,0.5)] active:scale-95'
              : 'bg-[#1b201e] text-[#697470] border border-[#27302c] cursor-not-allowed opacity-50'
          }`}
        >
          <span>Escolher</span>
          {selectedTypes.length === 1 && (
            <span className="text-[10px] opacity-80 font-bold">
              ({POKEMON_TYPES[selectedTypes[0]]?.namePt})
            </span>
          )}
          {selectedTypes.length === 2 && (
            <span className="text-[10px] opacity-80 font-bold">
              (Duplo)
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
