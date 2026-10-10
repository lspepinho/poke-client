import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PokemonTypeId, PokemonTypeInfo } from '../types/game';
import { POKEMON_TYPES } from '../data/typesInfo';
import { asset } from '../utils/asset';
import { Dices } from 'lucide-react';

interface TypeDisplayProps {
  currentType: PokemonTypeId | PokemonTypeId[] | null;
  isShuffling: boolean;
  shufflingType: PokemonTypeId | PokemonTypeId[] | null;
  onSpinAgain?: () => void;
  disabled?: boolean;
}

export const TypeDisplay: React.FC<TypeDisplayProps> = ({
  currentType,
  isShuffling,
  shufflingType,
}) => {
  const displayType = isShuffling ? shufflingType : currentType;
  const typeList: PokemonTypeId[] = React.useMemo(() => {
    if (!displayType) return [];
    return Array.isArray(displayType) ? displayType : [displayType];
  }, [displayType]);

  const firstTypeInfo: PokemonTypeInfo | undefined =
    typeList.length > 0 ? POKEMON_TYPES[typeList[0]] : undefined;

  return (
    <div className="w-full flex flex-col items-center justify-center">
      {typeList.length > 0 && firstTypeInfo ? (
        <div
          className={`relative ${
            typeList.length === 2
              ? 'w-56 sm:w-64 md:w-72 h-28 sm:h-36 md:h-44'
              : 'w-32 sm:w-40 md:w-48 h-28 sm:h-36 md:h-44'
          } rounded-2xl sm:rounded-3xl flex items-center justify-center text-center overflow-hidden border-2 shadow-2xl transition-colors duration-200 ${
            firstTypeInfo.borderColor
          } ${firstTypeInfo.bgColor}`}
        >
          {/* Thematic glowing background gradient */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${firstTypeInfo.gradient} opacity-30 filter blur-xl`}
          />

          {/* Official Pokémon Type Icons (1 or 2 elements) - Steady, no animation to not obstruct image */}
          <div className="relative z-10 flex items-center justify-center gap-2.5 sm:gap-4">
            {typeList.map((tId) => {
              const info = POKEMON_TYPES[tId];
              if (!info) return null;
              return (
                <div
                  key={tId}
                  className={`${
                    typeList.length === 2
                      ? 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 p-2.5 sm:p-3.5'
                      : 'w-18 h-18 sm:w-22 sm:h-22 md:w-28 md:h-28 p-3 sm:p-4'
                  } rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.6)] border border-white/25`}
                  style={{ backgroundColor: info.color }}
                >
                  <img
                    src={asset(`assets/types/${tId}.svg`)}
                    alt={info.namePt}
                    className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] select-none pointer-events-none"
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="w-32 sm:w-40 md:w-48 h-28 sm:h-36 md:h-44 rounded-2xl sm:rounded-3xl bg-slate-900/40 border-2 border-slate-800 flex items-center justify-center">
          <Dices className="w-10 h-10 sm:w-12 sm:h-12 text-slate-500" />
        </div>
      )}
    </div>
  );
};

