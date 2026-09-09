import type { SoundEvent } from "./simulation";
let context: AudioContext | undefined;
let enabled = true;
export function setAudio(value: boolean) {
  enabled = value;
}
export function unlockAudio() {
  try {
    context ??= new AudioContext();
    void context.resume();
  } catch {
    /* Audio is optional. */
  }
}
let noise: AudioBuffer | undefined;
function impactSound(event: SoundEvent) {
  const ctx = context!,
    now = ctx.currentTime;
  noise ??= (() => {
    const b = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  })();
  const source = ctx.createBufferSource(),
    filter = ctx.createBiquadFilter(),
    gain = ctx.createGain();
  source.buffer = noise;
  const sword = event === "sword",
    block = event === "block",
    heavy = event === "heavy";
  const duration = sword ? 0.17 : heavy ? 0.28 : 0.18;
  filter.type = sword ? "bandpass" : "lowpass";
  filter.frequency.setValueAtTime(sword ? 1900 : block ? 6000 : 1500, now);
  filter.frequency.exponentialRampToValueAtTime(
    sword ? 450 : 180,
    now + duration,
  );
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(
    sword ? 0.11 : heavy ? 0.3 : 0.19,
    now + 0.006,
  );
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(now);
  source.stop(now + duration);
  source.onended = () => {
    source.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
  if (!sword) {
    const oscillator = ctx.createOscillator(),
      bass = ctx.createGain();
    oscillator.type = block ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(block ? 1100 : heavy ? 130 : 190, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      block ? 400 : 45,
      now + 0.14,
    );
    bass.gain.setValueAtTime(heavy ? 0.24 : 0.13, now);
    bass.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    oscillator.connect(bass);
    bass.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.23);
    oscillator.onended = () => {
      oscillator.disconnect();
      bass.disconnect();
    };
  }
}
export function playSound(event: SoundEvent) {
  if (!enabled || !context) return;
  if (["sword", "hit", "heavy", "block", "hurt", "break"].includes(event)) {
    impactSound(event);
    return;
  }
  const notes: Partial<Record<SoundEvent, number[]>> = {
    gem: [880, 1320],
    door: [330, 440, 660],
    win: [392, 494, 587, 784],
  };
  notes[event]?.forEach((frequency, i) => {
    const oscillator = context!.createOscillator(),
      gain = context!.createGain(),
      t = context!.currentTime + i * 0.09;
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.06, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    oscillator.connect(gain);
    gain.connect(context!.destination);
    oscillator.start(t);
    oscillator.stop(t + 0.22);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  });
}
