import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CompactPokemon, PokemonTypeId } from '../types/game';
import { POKEMON_TYPES } from '../data/typesInfo';
import { formatPokemonName, getPokemonSprite } from '../utils/pokemonApi';
import { AlertTriangle, XCircle, Info } from 'lucide-react';

interface FeedbackBannerProps {
  feedback: {
    type: 'wrong_type' | 'already_used' | 'invalid';
    pokemon?: CompactPokemon;
    targetType?: PokemonTypeId | PokemonTypeId[];
    message?: string;
  } | null;
  onDismiss: () => void;
}

export const FeedbackBanner: React.FC<FeedbackBannerProps> = ({ feedback, onDismiss }) => {
  return (
    <AnimatePresence>
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="w-full max-w-xl mx-auto my-3 bg-red-950/80 backdrop-blur-md border border-red-500/50 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4 text-red-200"
        >
          <div className="flex items-center gap-3">
            {feedback.pokemon ? (
              <img
                src={getPokemonSprite(feedback.pokemon.id)}
                alt={feedback.pokemon.name}
                className="w-12 h-12 object-contain filter drop-shadow bg-slate-900/60 rounded-xl p-1 border border-red-500/30"
              />
            ) : (
              <div className="p-2.5 rounded-xl bg-red-900/50 text-red-400">
                <XCircle className="w-6 h-6" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-1.5 font-bold text-sm text-red-300">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                {feedback.type === 'wrong_type' && 'Tipo Incorreto!'}
                {feedback.type === 'already_used' && 'Pokémon Já Usado!'}
                {feedback.type === 'invalid' && 'Não Encontrado'}
              </div>

              {feedback.type === 'wrong_type' && feedback.pokemon && feedback.targetType && (
                <p className="text-xs text-red-200/90 mt-0.5">
                  <strong>{formatPokemonName(feedback.pokemon.name)}</strong> é do tipo{' '}
                  <span className="font-semibold text-white">
                    {feedback.pokemon.types.map((t) => POKEMON_TYPES[t]?.namePt).join(' / ')}
                  </span>
                  , e não{' '}
                  <span className="font-bold text-white">
                    {Array.isArray(feedback.targetType)
                      ? feedback.targetType.map((t) => POKEMON_TYPES[t]?.namePt).join(' / ')
                      : POKEMON_TYPES[feedback.targetType]?.namePt}
                  </span>
                  ! O cronômetro continua...
                </p>
              )}

              {feedback.type === 'already_used' && feedback.pokemon && (
                <p className="text-xs text-red-200/90 mt-0.5">
                  Você já pontuou com <strong>{formatPokemonName(feedback.pokemon.name)}</strong>{' '}
                  nesta partida. Escolha outro Pokémon!
                </p>
              )}

              {feedback.type === 'invalid' && (
                <p className="text-xs text-red-200/90 mt-0.5">
                  {feedback.message || 'Selecione um Pokémon válido na lista ou grid de busca.'}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="p-1 rounded-lg hover:bg-red-900/60 text-red-400 hover:text-white transition-colors cursor-pointer text-xs font-semibold px-2"
          >
            Fechar
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
