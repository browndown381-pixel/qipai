import React, { useMemo } from 'react';

/**
 * Lightweight GPU-accelerated floating gold dust particles for commercial hall background.
 */
export const AmbientParticles: React.FC = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      size: Math.floor(Math.random() * 6) + 3,
      left: Math.floor(Math.random() * 96) + 2,
      top: Math.floor(Math.random() * 92) + 4,
      duration: (Math.random() * 6 + 5).toFixed(1),
      delay: (Math.random() * 4).toFixed(1),
      opacity: (Math.random() * 0.4 + 0.2).toFixed(2),
    }));
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-gradient-to-t from-amber-400 to-amber-200 blur-[0.5px]"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: `${p.left}%`,
            top: `${p.top}%`,
            opacity: Number(p.opacity),
            animation: `floatSlow ${p.duration}s ease-in-out infinite alternate`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
};
