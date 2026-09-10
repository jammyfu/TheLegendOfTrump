import type { SoundEvent } from "./simulation";

export const SFX_SAMPLES = {
  // Fast, dry air cuts keep a miss readable; the impact layer is only fired
  // after a confirmed contact in Simulation.strike().
  sword: ["sword-1", "sword-2", "sword-3", "swish-light-1", "swish-light-2"],
  spin: ["swish-heavy-1", "swish-heavy-2", "sword-3"],
  arrow: ["arrow-1", "arrow-2"],
  bowDraw: ["bow-draw"],
  roll: ["roll-1", "roll-2"],
  block: ["block"],
  hit: ["body-1", "body-2"],
  heavy: ["body-1", "body-2"],
  punchHit: ["body-1", "body-2"],
  kickHit: ["body-1", "body-2"],
  hurt: ["body-1", "body-2"],
  arrowHit: ["body-2"],
  dart: ["sword-2"],
  break: ["break-wood"],
  gem: ["coin-1", "coin-2"],
  door: ["door-open"],
  chest: ["chest"],
  lever: ["latch"],
  equip: ["equip"],
  jump: ["jump"],
  land: ["land"],
  step: ["step-1", "step-2"],
  heal: ["heal"],
  enemySwing: ["sword-1", "sword-2"],
  enemyArrow: ["arrow-1", "arrow-2"],
  // Boss attacks keep their own procedural identity below, with a short CC0
  // recording layer for the physical metal/air contact.
  bossDartFire: ["arrow-1", "arrow-2"],
  bossSlamCharge: ["armor"],
  bossSweepCharge: ["swish-heavy-1", "swish-heavy-2"],
  bossSweepStrike: ["swish-heavy-1", "swish-heavy-2", "armor"],
  bossWaveRelease: ["armor"],
} satisfies Partial<Record<SoundEvent, string[]>>;
type SampleEvent = keyof typeof SFX_SAMPLES;
const buffers = new Map<string, AudioBuffer>();
let loading: Promise<void> | undefined;
const active = new Map<AudioBufferSourceNode, { kind: SampleEvent; gain: GainNode }>();
const lastPlayed = new Map<string, number>();
const previous = new Map<string, string>();

/** Decode once after an input gesture; never delay an attack awaiting a fetch. */
export function preloadSfx(ctx: AudioContext) {
  loading ??= Promise.all([...new Set([...Object.values(SFX_SAMPLES).flat(), "armor", "latch"])].map(async name => {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}audio/sfx/${name}.mp3`);
      if (!response.ok) return;
      const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
      // Normalize per clip with headroom; per-event gain below controls the mix.
      let peak = 0;
      for (let c = 0; c < buffer.numberOfChannels; c++)
        for (const value of buffer.getChannelData(c)) peak = Math.max(peak, Math.abs(value));
      if (peak > .001) for (let c = 0; c < buffer.numberOfChannels; c++) {
        const samples = buffer.getChannelData(c);
        // Do not boost quiet recording noise by an unbounded amount.
        for (let i = 0; i < samples.length; i++) samples[i] *= Math.min(3, .75 / peak);
      }
      buffers.set(name, buffer);
    } catch { /* Existing synthesis remains available if an asset cannot load. */ }
  })).then(() => {});
  return loading;
}

export function playSampledSfx(ctx: AudioContext, output: AudioNode, event: SoundEvent) {
  if (!(event in SFX_SAMPLES)) return false;
  const kind = event as SampleEvent;
  const choices = SFX_SAMPLES[kind];
  const ready = choices.filter(name => buffers.has(name));
  if (!ready.length) return false;
  // Cap crowd bursts and release nodes after playback; all voices use the SFX bus.
  if (ctx.currentTime - (lastPlayed.get(kind) ?? -1) < (kind === "step" ? .18 : .055)) return true;
  if (active.size >= 20) {
    // Player damage/defense must remain audible in a crowd.
    if (!["hit", "heavy", "hurt", "block"].includes(kind)) return true;
    const expendable = [...active].find(([, v]) =>
      ["step", "enemySwing", "enemyArrow", "gem"].includes(v.kind));
    if (!expendable) return true;
    const [source, voice] = expendable;
    voice.gain.gain.setTargetAtTime(0, ctx.currentTime, .005);
    source.stop(ctx.currentTime + .02);
    active.delete(source);
  }
  lastPlayed.set(kind, ctx.currentTime);
  const levels: Record<SampleEvent, number> = {
    sword: .24, spin: .29, arrow: .28, bowDraw: .12, roll: .22,
    block: .27, hit: .48, heavy: .6, punchHit: .44, kickHit: .56, hurt: .44,
    arrowHit: .3, dart: .16, break: .3, gem: .18, door: .22,
    chest: .2, lever: .2, equip: .15, jump: .12, land: .23,
    step: .085, heal: .18, enemySwing: .13, enemyArrow: .16,
    bossDartFire: .2, bossSlamCharge: .1, bossSweepCharge: .13,
    bossSweepStrike: .22, bossWaveRelease: .1,
  };
  const candidates = ready.filter(name => name !== previous.get(kind));
  const selected = (candidates.length ? candidates : ready);
  const name = selected[Math.floor(Math.random() * selected.length)];
  previous.set(kind, name);
  const play = (delay: number, clip = name, level = levels[kind]) => {
    if (!buffers.has(clip) || active.size >= 20) return;
    const source = ctx.createBufferSource(), gain = ctx.createGain();
    source.buffer = buffers.get(clip)!;
    source.playbackRate.value = (kind === "heavy" || kind === "kickHit" ? .8 : 1) * (.96 + Math.random() * .08);
    gain.gain.value = level;
    source.connect(gain); gain.connect(output); active.set(source, { kind, gain });
    source.onended = () => { active.delete(source); source.disconnect(); gain.disconnect(); };
    source.start(ctx.currentTime + delay);
  };
  play(0);
  if (kind === "spin" && active.size < 16) play(.28);
  // A subdued armor tick accompanies sword contact, never a missed swing or fist.
  if (kind === "hit" || kind === "heavy") play(.008, "armor", kind === "heavy" ? .12 : .07);
  if (kind === "chest") play(0, "latch", .14);
  return true;
}

/** Stop sustained/delayed action sounds when their originating action ends. */
export function syncSampledSfx(ctx: AudioContext, playing: boolean, drawing: boolean, spinning: boolean) {
  for (const [source, voice] of active) {
    if (playing && (voice.kind !== "bowDraw" || drawing) && (voice.kind !== "spin" || spinning)) continue;
    voice.gain.gain.cancelScheduledValues(ctx.currentTime);
    voice.gain.gain.setTargetAtTime(0, ctx.currentTime, .008);
    source.stop(ctx.currentTime + .035);
    active.delete(source);
  }
}
