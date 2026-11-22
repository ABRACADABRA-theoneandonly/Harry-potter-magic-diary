import React, { useEffect, useRef } from 'react';

interface EmberMote {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
  phase: number;
}

export const AmbientMagicLayer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const motes: EmberMote[] = Array.from({ length: 28 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 0.9 + Math.random() * 1.9,
      vx: (Math.random() - 0.5) * 0.22,
      vy: -0.18 - Math.random() * 0.34,
      alpha: 0.15 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
    }));

    let rafId = 0;
    let frame = 0;

    const tick = () => {
      frame += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const m of motes) {
        m.x += m.vx + Math.sin(frame + m.phase) * 0.15;
        m.y += m.vy;
        if (m.y < -10) {
          m.y = canvas.height + 10;
          m.x = Math.random() * canvas.width;
        }
        if (m.x < -10) m.x = canvas.width + 10;
        if (m.x > canvas.width + 10) m.x = -10;

        const flicker = 0.65 + 0.35 * Math.sin(frame * 2.1 + m.phase);
        ctx.save();
        ctx.globalAlpha = m.alpha * flicker;
        ctx.fillStyle = '#f3cb6e';
        ctx.shadowColor = '#e6bd62';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-75"
    />
  );
};
