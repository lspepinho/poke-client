import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { soundManager } from '../utils/audio';

interface TallyMarkProps {
  score: number; // 0 to 5
  animateNewStroke?: boolean;
  size?: number; // width & height in px
  className?: string;
}

/**
 * Prison Tally Box Component:
 * Stroke 1: Left vertical line (|)
 * Stroke 2: Top horizontal line (¯)
 * Stroke 3: Right vertical line (|)
 * Stroke 4: Bottom horizontal line (_) -> completes the square!
 * Stroke 5: Slash through the center (/) -> strikes through!
 */
export const TallyMark: React.FC<TallyMarkProps> = ({
  score,
  animateNewStroke = true,
  size = 180,
  className = '',
}) => {
  // Play scratching sound when the latest stroke draws
  useEffect(() => {
    if (score > 0 && animateNewStroke) {
      const timer = setTimeout(() => {
        soundManager.playTallyScratch();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [score, animateNewStroke]);

  // Organic hand-drawn paths with slight realistic curvature
  // Box coordinates roughly from (35, 35) to (145, 145) inside 180x180 viewBox
  const strokes = [
    // 1: Left vertical stroke (downwards with slight tilt)
    {
      id: 1,
      d: 'M 38 34 C 36 65, 34 110, 37 146',
      label: '1º Risco (Esquerda)',
    },
    // 2: Top horizontal stroke (left to right across top)
    {
      id: 2,
      d: 'M 34 38 C 70 35, 115 37, 146 36',
      label: '2º Risco (Em Cima)',
    },
    // 3: Right vertical stroke (top to bottom on right)
    {
      id: 3,
      d: 'M 144 33 C 146 68, 143 112, 145 147',
      label: '3º Risco (Direita)',
    },
    // 4: Bottom horizontal stroke (right to left or left to right, completing square)
    {
      id: 4,
      d: 'M 35 144 C 72 147, 110 144, 148 143',
      label: '4º Risco (Embaixo - Quadrado!)',
    },
    // 5: Diagonal strike through the middle (slashing across the box)
    {
      id: 5,
      d: 'M 24 156 C 65 115, 115 65, 158 24',
      label: '5º Risco (No Meio - Vitória!)',
    },
  ];

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox="0 0 180 180"
        width={size}
        height={size}
        className="overflow-visible filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]"
      >
        {/* Subtle graphite background guide line (very faint pencil indent) */}
        <g stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" opacity="0.35" fill="none">
          <rect x="37" y="36" width="108" height="108" rx="2" />
          <line x1="28" y1="152" x2="154" y2="28" />
        </g>

        {/* Drawn strokes */}
        {strokes.map((stroke, index) => {
          const isDrawn = score >= stroke.id;
          const isLatest = score === stroke.id;

          if (!isDrawn) return null;

          return (
            <g key={stroke.id}>
              {/* Secondary graphite soft shadow for depth */}
              <motion.path
                d={stroke.d}
                fill="none"
                stroke="#475569"
                strokeWidth={stroke.id === 5 ? '6' : '5'}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.3"
                initial={
                  isLatest && animateNewStroke
                    ? { pathLength: 0 }
                    : { pathLength: 1 }
                }
                animate={{ pathLength: 1 }}
                transition={{
                  duration: 0.45,
                  ease: 'easeInOut',
                  delay: isLatest && animateNewStroke ? 0.2 : 0,
                }}
              />

              {/* Main dark graphite / ink stroke */}
              <motion.path
                d={stroke.d}
                fill="none"
                stroke={stroke.id === 5 ? '#b91c1c' : '#1e293b'}
                strokeWidth={stroke.id === 5 ? '5.5' : '4.5'}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={
                  isLatest && animateNewStroke
                    ? { pathLength: 0 }
                    : { pathLength: 1 }
                }
                animate={{ pathLength: 1 }}
                transition={{
                  duration: 0.4,
                  ease: [0.25, 0.1, 0.25, 1],
                  delay: isLatest && animateNewStroke ? 0.2 : 0,
                }}
              />

              {/* Extra jitter stroke for raw prison wall / handmade notebook feel */}
              <motion.path
                d={stroke.d}
                fill="none"
                stroke={stroke.id === 5 ? '#dc2626' : '#0f172a'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="9 2 5 1"
                opacity="0.75"
                initial={
                  isLatest && animateNewStroke
                    ? { pathLength: 0 }
                    : { pathLength: 1 }
                }
                animate={{ pathLength: 1 }}
                transition={{
                  duration: 0.38,
                  ease: 'easeOut',
                  delay: isLatest && animateNewStroke ? 0.22 : 0,
                }}
              />
            </g>
          );
        })}
      </svg>

      {/* Visual stroke badges indicators */}
      <div className="flex items-center gap-1.5 mt-2">
        {[1, 2, 3, 4, 5].map((step) => {
          const active = score >= step;
          const isLast = step === 5;
          return (
            <div
              key={step}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                active
                  ? isLast
                    ? 'w-6 bg-red-600 shadow-sm shadow-red-500/50'
                    : 'w-4 bg-slate-800'
                  : 'w-2 bg-slate-300/60'
              }`}
              title={`Ponto ${step}`}
            />
          );
        })}
      </div>
    </div>
  );
};
