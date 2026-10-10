import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, CornerDownLeft, Sparkles } from 'lucide-react';
import { CompactPokemon, PokemonTypeId } from '../types/game';
import {
  searchPokemon,
  formatPokemonName,
  formatDexNumber,
  getPokemonSprite,
} from '../utils/pokemonApi';
import { POKEMON_TYPES } from '../data/typesInfo';
import { soundManager } from '../utils/audio';

interface ExpandableSearchBarProps {
  targetType: PokemonTypeId | PokemonTypeId[] | null;
  onSelectPokemon: (pokemon: CompactPokemon) => void;
  disabled?: boolean;
  usedPokemonIds: Set<number>;
  maxDexId?: number;
}

export const ExpandableSearchBar: React.FC<ExpandableSearchBarProps> = ({
  targetType,
  onSelectPokemon,
  disabled = false,
  usedPokemonIds,
  maxDexId = 1025,
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [results, setResults] = useState<CompactPokemon[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Live real-time search whenever query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }
    const matches = searchPokemon(query, 24, maxDexId);
    setResults(matches);
    setSelectedIndex(0);
  }, [query, maxDexId]);

  // Global hotkey: Press "/" or "Cmd/Ctrl+K" to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) &&
        document.activeElement !== inputRef.current
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Keyboard navigation within results
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        e.preventDefault();
        // Try searching single best match
        const singleMatch = searchPokemon(query, 1)[0];
        if (singleMatch) {
          handleChoose(singleMatch);
        }
      }
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
      soundManager.playTick();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
      soundManager.playTick();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleChoose(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      inputRef.current?.blur();
      setIsFocused(false);
    }
  };

  const handleChoose = (pokemon: CompactPokemon) => {
    soundManager.playTick();
    onSelectPokemon(pokemon);
    setQuery('');
    setResults([]);
    // Keep focus or blur gently
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  const isExpanded = isFocused || query.length > 0;

  return (
    <div ref={containerRef} className="w-full max-w-4xl mx-auto relative z-20">
      {/* Search Input Box */}
      <motion.div
        animate={{
          boxShadow: isExpanded
            ? '0 10px 30px -5px rgba(0, 0, 0, 0.4), 0 0 20px 2px rgba(239, 68, 68, 0.2)'
            : '0 4px 15px -3px rgba(0, 0, 0, 0.2)',
        }}
        transition={{ duration: 0.2 }}
        className={`relative flex items-center bg-slate-900/90 backdrop-blur-md rounded-2xl border transition-all duration-200 ${
          isExpanded
            ? 'border-rose-500/80 ring-2 ring-rose-500/30'
            : 'border-slate-700/80 hover:border-slate-600'
        }`}
      >
        <div className="pl-4 pr-2 text-slate-400 flex items-center justify-center">
          <Search
            className={`w-5 h-5 transition-colors ${
              isExpanded ? 'text-rose-400 animate-pulse' : 'text-slate-400'
            }`}
          />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay closing slightly to allow card clicks
            setTimeout(() => setIsFocused(false), 200);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={
            targetType
              ? Array.isArray(targetType)
                ? `Digite um Pokémon dos tipos ${targetType.map((t) => POKEMON_TYPES[t]?.namePt).join(' e ')}...`
                : `Digite um Pokémon do tipo ${POKEMON_TYPES[targetType]?.namePt}...`
              : 'Aguardando seleção do tipo...'
          }
          className="w-full py-4 pr-12 bg-transparent text-slate-100 placeholder-slate-400 text-base sm:text-lg font-medium focus:outline-hidden disabled:opacity-50"
        />

        {/* Clear Indicator */}
        <div className="pr-4 flex items-center gap-2">
          {query && (
            <button
              onClick={handleClear}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Limpar pesquisa"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Expandable Live Search Grid */}
      <AnimatePresence>
        {isExpanded && query.trim().length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2.5 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-3 sm:p-4 shadow-2xl overflow-hidden max-h-[60vh] flex flex-col"
          >
            {/* Header info in tray */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs text-slate-400 font-medium">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                <span>
                  {results.length > 0
                    ? `Encontrados ${results.length} Pokémon para "${query}"`
                    : `Nenhum Pokémon encontrado com "${query}"`}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[11px]">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-[10px]">
                    ↑↓←→
                  </kbd>{' '}
                  Navegar
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-[10px] flex items-center">
                    <CornerDownLeft className="w-2.5 h-2.5 mr-0.5" /> Enter
                  </kbd>{' '}
                  Selecionar
                </span>
              </div>
            </div>

            {/* Results Grid */}
            {results.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 overflow-y-auto p-1 max-h-[50vh]">
                {results.map((pokemon, index) => {
                  const isSelected = index === selectedIndex;
                  const alreadyUsed = usedPokemonIds.has(pokemon.id);

                  return (
                    <motion.button
                      key={pokemon.id}
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleChoose(pokemon)}
                      className={`relative flex flex-col items-center p-2.5 rounded-xl border text-left transition-all cursor-pointer group ${
                        isSelected
                          ? 'bg-slate-800 border-rose-500 ring-2 ring-rose-500/40 shadow-lg'
                          : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80 hover:border-slate-600'
                      } ${alreadyUsed ? 'opacity-40 grayscale' : ''}`}
                    >
                      {/* Sprite Image */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center my-1">
                        <img
                          src={getPokemonSprite(pokemon.id)}
                          alt={pokemon.name}
                          loading="lazy"
                          className="w-full h-full object-contain filter drop-shadow group-hover:scale-110 transition-transform duration-200"
                        />
                      </div>

                      {/* Name */}
                      <div className="w-full text-center">
                        <span className="font-bold text-xs sm:text-sm text-slate-100 truncate block group-hover:text-rose-300">
                          {formatPokemonName(pokemon.name)}
                        </span>

                        {alreadyUsed && (
                          <span className="text-[9px] text-amber-400 mt-1 block font-semibold">
                            Já utilizado
                          </span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                <p className="text-sm">Nenhum Pokémon encontrado com esse nome.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Tente digitar o nome oficial ou número da Pokédex.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
