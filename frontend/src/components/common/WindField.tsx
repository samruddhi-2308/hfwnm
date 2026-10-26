import { useEffect, useRef } from 'react';

/** Animated wind streamlines for the hero. Static when reduced motion is requested. */
export function WindField({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, t = 0, raf = 0;

    const resize = () => {
      w = c.clientWidth; h = c.clientHeight;
      c.width = w * dpr; c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const ps = Array.from({ length: 110 }, () => ({ x: Math.random() * w, y: Math.random() * h, life: Math.random() * 200 }));
    const angle = (x: number, y: number) => Math.sin(x * 0.004 + t) * 0.6 + Math.cos(y * 0.008 - t * 0.7) * 0.5;

    const draw = () => {
      t += 0.004;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(79,214,228,0.6)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const p of ps) {
        const a = angle(p.x, p.y);
        const nx = p.x + Math.cos(a) * 1.8 + 1.3;
        const ny = p.y + Math.sin(a) * 1.8;
        ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny);
        p.x = nx; p.y = ny; p.life++;
        if (p.x > w || p.y < 0 || p.y > h || p.life > 260) { p.x = Math.random() * w * 0.25 - 20; p.y = Math.random() * h; p.life = 0; }
      }
      ctx.stroke();
    };

    const cleanup = () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
    if (reduce) { for (let i = 0; i < 260; i++) draw(); return cleanup; }
    const loop = () => { draw(); raf = requestAnimationFrame(loop); };
    loop();
    return cleanup;
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={`h-full w-full ${className}`} />;
}
