import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { RoundRecord } from '../types/game';
import { POKEMON_TYPES } from '../data/typesInfo';
import { formatDexNumber, formatPokemonName, getPokemonOfficialArtwork } from '../utils/pokemonApi';
import { TallyMark } from './TallyMark';
import { soundManager } from '../utils/audio';
import { Trophy, RotateCcw, Share2, Zap, Clock, BookOpen, Check } from 'lucide-react';

interface VictoryScreenProps {
  records: RoundRecord[];
  onRestart: () => void;
  onOpenNotebook: () => void;
}

export const VictoryScreen: React.FC<VictoryScreenProps> = ({
  records,
  onRestart,
  onOpenNotebook,
}) => {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    soundManager.playVictory();

    // Trigger multiple bursts of confetti
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  const totalTimeMs = records.reduce((acc, r) => acc + r.reactionTimeMs, 0);
  const avgTimeMs = records.length > 0 ? totalTimeMs / records.length : 0;
  const bestRecord = records.reduce((prev, curr) =>
    curr.reactionTimeMs < prev.reactionTimeMs ? curr : prev,
    records[0]
  );

  const handleShare = () => {
    const text = `🏆 Completei o Desafio PokéType com 5/5 pontos! 
⚡ Tempo Médio: ${(avgTimeMs / 1000).toFixed(2)}s 
🎯 Melhor Reação: ${(bestRecord?.reactionTimeMs / 1000).toFixed(2)}s com ${formatPokemonName(bestRecord?.pokemon.name || '')}
Caderno completado com sucesso!`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-4xl mx-auto bg-slate-900/90 backdrop-blur-xl border-2 border-amber-500/60 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden"
    >
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose-500/10 rounded-full filter blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="text-center relative z-10 mb-8">
        <motion.div
          initial={{ rotate: -15, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: 'spring', damping: 12 }}
          className="inline-flex p-4 rounded-3xl bg-amber-500/20 border border-amber-500/40 text-amber-400 mb-3 shadow-lg shadow-amber-500/20"
        >
          <Trophy className="w-12 h-12" />
        </motion.div>

        <h1 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-amber-200">
          PARABÉNS! VOCÊ VENCEU!
        </h1>
        <p className="text-sm sm:text-base text-slate-300 mt-2 font-medium">
          Você acertou os 5 Pokémon solicitados e completou todas as marcas no caderno de contagem!
        </p>
      </div>

      {/* Tally Mark Trophy & Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Completed Tally Card */}
        <div className="bg-[#faf7ee] text-slate-900 rounded-2xl p-5 border-2 border-[#e2d9c2] shadow-md flex flex-col items-center justify-center relative">
          <span
            className="text-xs uppercase font-extrabold text-slate-500 tracking-wider mb-1"
            style={{ fontFamily: "'Architects Daughter', cursive" }}
          >
            Caderno Completo (5/5)
          </span>
          <TallyMark score={5} animateNewStroke={false} size={140} />
          <div
            className="text-xs font-bold text-red-700 mt-2"
            style={{ fontFamily: "'Architects Daughter', cursive" }}
          >
            Liberdade Conquistada!
          </div>
        </div>

        {/* Stats Column */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/80 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400">Tempo Total</div>
              <div className="text-2xl font-black font-mono text-white">
                {(totalTimeMs / 1000).toFixed(2)}s
              </div>
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/80 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400">Tempo Médio de Reação</div>
              <div className="text-2xl font-black font-mono text-white">
                {(avgTimeMs / 1000).toFixed(2)}s
              </div>
            </div>
          </div>

          <div className="sm:col-span-2 bg-slate-800/80 rounded-2xl p-4 border border-slate-700/80 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400">
                Melhor Rodada (Mais Rápida)
              </div>
              <div className="text-lg font-bold text-amber-300 mt-0.5">
                {bestRecord ? formatPokemonName(bestRecord.pokemon.name) : '-'} (
                {(Array.isArray(bestRecord?.typeId)
                  ? bestRecord.typeId.map((t) => POKEMON_TYPES[t]?.namePt).join(' / ')
                  : bestRecord?.typeId
                    ? POKEMON_TYPES[bestRecord.typeId]?.namePt
                    : '')}
                )
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-amber-400">
              {bestRecord ? (bestRecord.reactionTimeMs / 1000).toFixed(2) : '0.00'}s
            </div>
          </div>
        </div>
      </div>

      {/* The 5 Champion Pokémon Showcase */}
      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
          <span>Seus 5 Pokémon Escolhidos:</span>
          <span className="text-xs font-normal text-slate-500">1 por rodada</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {records.map((r, i) => (
            <div
              key={i}
              className="bg-slate-800/60 rounded-2xl p-3 border border-slate-700 flex flex-col items-center text-center group hover:border-slate-500 transition-all"
            >
              <span className="text-[10px] font-mono font-bold text-slate-400 self-start">
                #{i + 1}
              </span>
              <img
                src={getPokemonOfficialArtwork(r.pokemon.id)}
                alt={r.pokemon.name}
                className="w-20 h-20 object-contain my-1 group-hover:scale-110 transition-transform filter drop-shadow-md"
              />
              <span className="font-bold text-xs text-white truncate max-w-full">
                {formatPokemonName(r.pokemon.name)}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {formatDexNumber(r.pokemon.id)}
              </span>

              <div className="flex items-center gap-1 mt-1.5 flex-wrap justify-center">
                {(Array.isArray(r.typeId) ? r.typeId : [r.typeId]).map((t) => (
                  <span
                    key={t}
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: POKEMON_TYPES[t]?.color }}
                  >
                    {POKEMON_TYPES[t]?.namePt}
                  </span>
                ))}
              </div>

              <span className="text-[11px] font-mono text-slate-300 mt-1 font-semibold">
                {(r.reactionTimeMs / 1000).toFixed(2)}s
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onRestart}
          className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-base shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 group cursor-pointer"
        >
          <RotateCcw className="w-5 h-5 group-hover:-rotate-90 transition-transform" />
          <span>Jogar Novamente</span>
        </button>

        <button
          onClick={onOpenNotebook}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <BookOpen className="w-4 h-4 text-amber-300" />
          <span>Examinar Caderno</span>
        </button>

        <button
          onClick={handleShare}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          <span>{copied ? 'Copiado para Área de Transferência!' : 'Copiar Resultado'}</span>
        </button>
      </div>
    </motion.div>
  );
};
