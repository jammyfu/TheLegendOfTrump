import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { game } from "../game/simulation";
/** Slow sustained frames lower only render resolution; HUD stays native resolution. */
export function AdaptiveResolution({
  onChange,
}: {
  onChange: (dpr: number) => void;
}) {
  const sample = useRef({
    seconds: 0,
    frames: 0,
    level: 1,
    warmup: 2,
    stable: 0,
  });
  useFrame((_, delta) => {
    const s = sample.current;
    if (game.phase !== "playing" || delta > 0.5) {
      s.seconds = 0;
      s.frames = 0;
      return;
    }
    if (s.warmup > 0) {
      s.warmup -= delta;
      return;
    }
    s.seconds += delta;
    s.frames++;
    if (s.seconds < 2) return;
    const average = s.seconds / s.frames;
    s.stable = average < 0.018 ? s.stable + s.seconds : 0;
    let next = s.level;
    if (average > 0.027)
      next = Math.max(0.7, Math.round((s.level - 0.15) * 100) / 100);
    else if (s.stable > 8) {
      next = Math.min(1, Math.round((s.level + 0.15) * 100) / 100);
      s.stable = 0;
    }
    s.seconds = 0;
    s.frames = 0;
    if (next !== s.level) {
      s.level = next;
      onChange(next);
    }
  });
  return null;
}
