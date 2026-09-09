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
export function playSound(event: SoundEvent) {
  if (!enabled || !context) return;
  const notes: Record<SoundEvent, number[]> = {
    gem: [880, 1320],
    sword: [180, 90],
    hit: [120, 70],
    break: [240, 360, 480],
    door: [330, 440, 660],
    win: [392, 494, 587, 784],
  };
  notes[event].forEach((frequency, i) => {
    const oscillator = context!.createOscillator(),
      gain = context!.createGain();
    const t = context!.currentTime + i * 0.09;
    oscillator.type = event === "sword" ? "sawtooth" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.06, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    oscillator.connect(gain);
    gain.connect(context!.destination);
    oscillator.start(t);
    oscillator.stop(t + 0.22);
  });
}
