import React from 'react';
import { Timer, Zap, Flame, Target, Compass, Clock } from 'lucide-react';

interface ReactionTimerProps {
  elapsedMs: number;
  isRunning: boolean;
  bestTimeMs?: number | null;
  timeLimitSeconds?: number; // e.g. 20s (Easy), 15s (Medium), 10s (Hard)
}

export const ReactionTimer: React.FC<ReactionTimerProps> = ({
  elapsedMs,
  isRunning,
  bestTimeMs,
  timeLimitSeconds = 20,
}) => {
  const seconds = (elapsedMs / 1000).toFixed(2);
  const totalLimitMs = timeLimitSeconds * 1000;
  const remainingMs = Math.max(0, totalLimitMs - elapsedMs);
  const remainingSeconds = (remainingMs / 1000).toFixed(1);
  const progressPercent = Math.max(0, Math.min(100, (remainingMs / totalLimitMs) * 100));

  const isLowTime = remainingMs < 4000;

  // Speed tier calculation
  const getTier = () => {
    const s = elapsedMs / 1000;
    if (s < 2.0) {
      return {
        label: '⚡ Reflexo Relâmpago!',
        color: 'text-amber-400 border-amber-400/40 bg-amber-500/10',
        icon: Zap,
      };
    }
    if (s < 3.5) {
      return {
        label: '🔥 Super Rápido!',
        color: 'text-orange-400 border-orange-400/40 bg-orange-500/10',
        icon: Flame,
      };
    }
    if (s < 5.0) {
      return {
        label: '🎯 Bom Reflexo!',
        color: 'text-emerald-400 border-emerald-400/40 bg-emerald-500/10',
        icon: Target,
      };
    }
    return {
      label: '🧭 No Seu Ritmo',
      color: 'text-sky-400 border-sky-400/40 bg-sky-500/10',
      icon: Compass,
    };
  };

  const tier = getTier();
  const TierIcon = tier.icon;

  return (
    <div className="flex flex-col gap-2 bg-slate-900/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-slate-800 shadow-md">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Stopwatch display */}
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              isLowTime
                ? 'bg-rose-500/30 text-rose-400 animate-ping'
                : isRunning
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-slate-800 text-slate-400'
            }`}
          >
            <Timer className="w-5 h-5" />
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Tempo de Reação
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white flex items-baseline gap-1">
              <span>{seconds}</span>
              <span className="text-xs font-semibold text-slate-400">s</span>
            </div>
          </div>
        </div>

        {/* Remaining Time / Countdown */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-end gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              Tempo Restante
            </div>
            <div
              className={`text-xl sm:text-2xl font-black font-mono ${
                isLowTime ? 'text-rose-400 animate-pulse' : 'text-amber-300'
              }`}
            >
              {remainingSeconds}s
            </div>
          </div>

          {/* Tier badge */}
          <div
            className={`hidden md:flex px-3 py-1.5 rounded-xl border items-center gap-1.5 text-xs font-bold transition-all ${tier.color}`}
          >
            <TierIcon className="w-4 h-4" />
            <span>{tier.label}</span>
          </div>

          {bestTimeMs && (
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400">Recorde</span>
              <span className="font-mono text-xs font-bold text-amber-300">
                {(bestTimeMs / 1000).toFixed(2)}s
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Countdown Progress Bar */}
      <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full transition-all duration-75 ${
            isLowTime ? 'bg-rose-500' : progressPercent < 50 ? 'bg-amber-400' : 'bg-emerald-400'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};
