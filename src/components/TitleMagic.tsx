import { useEffect, useRef } from "react";

/** One title-only canvas: sprite motes, winged wisps and fading light trails. */
export function TitleMagic() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!,
      ctx = canvas.getContext("2d");
    if (!ctx) return;
    const surface = canvas.parentElement!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let width = 1,
      height = 1,
      frame = 0,
      time = 0,
      last = 0,
      disposed = false;
    const pointer = { x: 0.5, y: 0.4 };
    const trails: { x: number; y: number }[][] = Array.from(
      { length: 5 },
      () => [],
    );
    const resize = () => {
      width = surface.clientWidth;
      height = surface.clientHeight;
      const dpr = Math.min(devicePixelRatio, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      trails.forEach((t) => (t.length = 0));
    };
    const move = (event: PointerEvent) => {
      const r = surface.getBoundingClientRect();
      pointer.x = (event.clientX - r.left) / r.width;
      pointer.y = (event.clientY - r.top) / r.height;
    };
    const draw = (now: number) => {
      if (disposed) return;
      const dt = last ? Math.min(0.04, (now - last) / 1000) : 0;
      last = now;
      if (!reduced.matches) time += dt;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      const count = width < 600 ? 42 : 82;
      for (let i = 0; i < count; i++) {
        const x =
          ((i * 0.61803398875 + Math.sin(time * 0.15 + i) * 0.016) % 1) * width;
        const y =
          (1 - ((i * 0.41421356 + time * (0.009 + (i % 3) * 0.002)) % 1)) *
          height;
        const alpha = 0.16 + 0.3 * (0.5 + 0.5 * Math.sin(time * 1.3 + i * 2));
        ctx.fillStyle =
          i % 3 ? `rgba(255,211,127,${alpha})` : `rgba(153,239,255,${alpha})`;
        const r = i % 7 === 0 ? 1.8 : 0.8;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 5; i++) {
        const a = time * (0.15 + i * 0.015) + i * Math.PI * 0.4;
        const x =
          width * (0.5 + Math.cos(a) * (0.31 + (i % 2) * 0.07)) +
          (pointer.x - 0.5) * 12;
        const y =
          height * (0.36 + Math.sin(a * 1.4 + i) * 0.18) +
          (pointer.y - 0.4) * 9;
        const cool = i % 2 === 0,
          color = cool ? "134,229,255" : "255,216,137";
        const trail = trails[i];
        trail.push({ x, y });
        if (trail.length > 24) trail.shift();
        for (let j = 1; j < trail.length; j++) {
          ctx.strokeStyle = `rgba(${color},${(j / trail.length) * 0.25})`;
          ctx.lineWidth = 0.3 + (j / trail.length) * 1.3;
          ctx.beginPath();
          ctx.moveTo(trail[j - 1].x, trail[j - 1].y);
          ctx.lineTo(trail[j].x, trail[j].y);
          ctx.stroke();
        }
        const radius = 24 + Math.sin(time * 2 + i) * 4;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
        glow.addColorStop(0, `rgba(${color},.7)`);
        glow.addColorStop(0.18, `rgba(${color},.25)`);
        glow.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(a) * 0.3);
        const flap = 0.5 + 0.5 * Math.sin(time * 16 + i);
        for (const side of [-1, 1]) {
          ctx.fillStyle = `rgba(${color},.5)`;
          ctx.beginPath();
          ctx.ellipse(
            side * (5 + flap * 2),
            -3,
            3 + flap * 2,
            7,
            side * 0.85,
            0,
            Math.PI * 2,
          );
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(side * 4, 4, 2.5, 4, -side * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#fffde9";
        ctx.beginPath();
        ctx.ellipse(0, 0, 1.9, 3.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (!reduced.matches && !document.hidden)
        frame = requestAnimationFrame(draw);
    };
    const restart = () => {
      cancelAnimationFrame(frame);
      last = 0;
      if (!document.hidden) frame = requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(() => {
      resize();
      restart();
    });
    observer.observe(surface);
    surface.addEventListener("pointermove", move);
    document.addEventListener("visibilitychange", restart);
    reduced.addEventListener("change", restart);
    resize();
    restart();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      surface.removeEventListener("pointermove", move);
      document.removeEventListener("visibilitychange", restart);
      reduced.removeEventListener("change", restart);
    };
  }, []);
  return <canvas ref={ref} className="lt-magic" aria-hidden="true" />;
}
