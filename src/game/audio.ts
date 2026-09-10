import { INTRO_DURATION, introPose } from "./intro";
import { PICKUP_NOTES } from "./pickup";
import { preloadSfx, playSampledSfx, syncSampledSfx } from "./sampledSfx";
import {
  getAudioSettings,
  saveAudioSettings,
  type AudioSettings,
} from "./audioSettings";
import { musicEnabled, unlockMusic } from "./music";
import type { SoundEvent } from "./simulation";
let context: AudioContext | undefined;
let enabled = getAudioSettings().enabled;
let output: GainNode | undefined;
export type UiSound = "select" | "confirm" | "back" | "toggle" | "press";

/** A quiet, plucked metal accent below combat SFX; shares the effects bus. */
export function playUiSound(kind: UiSound = "select") {
  // Action buttons are voiced by successful gameplay actions, not an extra beep.
  if (kind === "press") return;
  if (!getAudioSettings().enabled || getAudioSettings().effects <= 0) return;
  unlockAudio();
  if (!context || !output) return;
  const ctx = context,
    now = ctx.currentTime;
  const notes: Record<UiSound, number[]> = {
    select: [740],
    confirm: [660, 990],
    back: [660, 440],
    toggle: [830],
    press: [330],
  };
  notes[kind].forEach((frequency, index) => {
    const tone = ctx.createOscillator(),
      envelope = ctx.createGain();
    const time = now + index * 0.055;
    const duration = 0.1;
    tone.type = "triangle";
    tone.frequency.setValueAtTime(frequency, time);
    tone.frequency.exponentialRampToValueAtTime(
      frequency * 0.82,
      time + duration,
    );
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(
      0.035,
      time + 0.004,
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    tone.connect(envelope);
    envelope.connect(output!);
    tone.start(time);
    tone.stop(time + duration + 0.01);
    tone.onended = () => {
      tone.disconnect();
      envelope.disconnect();
    };
  });
}
export function updateAudioSettings(patch: Partial<AudioSettings>) {
  saveAudioSettings(patch);
  const settings = getAudioSettings();
  enabled = settings.enabled;
  musicEnabled(enabled);
  if (output && context)
    output.gain.setTargetAtTime(
      enabled ? settings.effects : 0,
      context.currentTime,
      0.03,
    );
}
export function setAudio(value: boolean) {
  updateAudioSettings({ enabled: value });
}
export function unlockAudio() {
  unlockMusic();
  try {
    context ??= new AudioContext();
    if (!output) {
      output = context.createGain();
      output.gain.value = enabled ? getAudioSettings().effects : 0;
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -9;
      limiter.knee.value = 6;
      limiter.ratio.value = 12;
      limiter.attack.value = .003;
      limiter.release.value = .12;
      output.connect(limiter);
      limiter.connect(context.destination);
    }
    void context.resume().catch(() => {});
    void preloadSfx(context);
  } catch {
    /* Audio is optional. */
  }
}
let noise: AudioBuffer | undefined;
let chargeLoop:
  | {
      carrier: OscillatorNode;
      overtone: OscillatorNode;
      filter: BiquadFilterNode;
      gain: GainNode;
    }
  | undefined;

/** A held charge is intentionally quiet: it supplies tension without masking
 * enemy tells, then the ready cue and spin release provide the payoff. */
function syncChargeLoop(active: boolean) {
  if (!context || !output) return;
  const ctx = context;
  if (active && !chargeLoop) {
    const carrier = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    carrier.type = "sawtooth";
    overtone.type = "triangle";
    carrier.frequency.setValueAtTime(96, ctx.currentTime);
    carrier.frequency.exponentialRampToValueAtTime(152, ctx.currentTime + 0.7);
    overtone.frequency.setValueAtTime(192, ctx.currentTime);
    overtone.frequency.exponentialRampToValueAtTime(304, ctx.currentTime + 0.7);
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(480, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.7);
    filter.Q.value = 0.85;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.038, ctx.currentTime + 0.12);
    carrier.connect(filter);
    overtone.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    carrier.start();
    overtone.start();
    chargeLoop = { carrier, overtone, filter, gain };
  } else if (!active && chargeLoop) {
    const loop = chargeLoop;
    chargeLoop = undefined;
    loop.gain.gain.cancelScheduledValues(ctx.currentTime);
    loop.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.018);
    loop.carrier.stop(ctx.currentTime + 0.09);
    loop.overtone.stop(ctx.currentTime + 0.09);
    loop.carrier.onended = () => {
      loop.carrier.disconnect();
      loop.overtone.disconnect();
      loop.filter.disconnect();
      loop.gain.disconnect();
    };
  }
}

function chargeReadySound() {
  if (!context || !output) return;
  const now = context.currentTime;
  [220, 330, 494].forEach((frequency, index) => {
    const oscillator = context!.createOscillator();
    const gain = context!.createGain();
    const time = now + index * 0.045;
    oscillator.type = index === 2 ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency * 0.82, time);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.12, time + 0.12);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(index === 2 ? 0.065 : 0.04, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
    oscillator.connect(gain);
    gain.connect(output!);
    oscillator.start(time);
    oscillator.stop(time + 0.23);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  });
}

/**
 * Healing must remain readable even while a sampled clip is still decoding on
 * a phone.  This bright, rising chime sits above the bottle/grass sample and
 * is shared by potions, herbs, benches, and fountains.
 */
function healingSound() {
  if (!context || !output) return;
  const ctx = context, outputNode = output, now = ctx.currentTime;
  [392, 587.33, 783.99].forEach((frequency, index) => {
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    const time = now + index * .065;
    const duration = .32 + index * .035;
    oscillator.type = index === 0 ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(frequency * .94, time);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.045, time + duration);
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.exponentialRampToValueAtTime(index === 2 ? .072 : .052, time + .014);
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    oscillator.connect(gain);
    gain.connect(outputNode);
    oscillator.start(time);
    oscillator.stop(time + duration + .025);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  });
}
function impactSound(event: SoundEvent) {
  const ctx = context!,
    now = ctx.currentTime;
  const variation = 0.94 + Math.random() * 0.12;
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
  source.loop = event === "spin";
  const sword = event === "sword" || event === "spin" || event === "fistSwing",
    block = event === "block",
    heavy = event === "heavy" || event === "kickHit" || event === "slam";
  const duration = event === "fistSwing" ? .09 : event === "spin" ? 0.65 : sword ? 0.2 : heavy ? 0.32 : 0.2;
  filter.type = sword ? "bandpass" : "lowpass";
  filter.frequency.setValueAtTime(
    (sword ? 2100 : block ? 6800 : heavy ? 1050 : 1800) * variation,
    now,
  );
  filter.frequency.exponentialRampToValueAtTime(
    (sword ? 420 : 180) * variation,
    now + duration,
  );
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(
    event === "fistSwing" ? .055 : sword ? 0.13 : heavy ? 0.28 : 0.17,
    now + 0.006,
  );
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(output!);
  source.start(now);
  source.stop(now + duration);
  source.onended = () => {
    source.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
  // The noise layer sells impact mass; these short, detuned tonal layers make
  // sword contact, shields and heavy armor read as different materials.
  const tones: Partial<Record<SoundEvent, [number, number, number][]>> = {
    sword: [
      [930, 370, 0.045],
      [1480, 620, 0.028],
    ],
    hit: [
      [185, 68, 0.09],
      [760, 280, 0.035],
    ],
    heavy: [
      [118, 42, 0.16],
      [310, 88, 0.065],
    ],
    slam: [
      [78, 31, 0.23],
      [210, 54, 0.09],
    ],
    block: [
      [1320, 720, 0.09],
      [1970, 930, 0.045],
    ],
    hurt: [
      [210, 92, 0.07],
      [420, 155, 0.03],
    ],
    break: [
      [540, 135, 0.06],
      [880, 230, 0.035],
    ],
  };
  tones[event]?.forEach(([start, end, level], index) => {
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    const time = now + index * 0.008;
    oscillator.type = event === "block" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(start * variation, time);
    oscillator.frequency.exponentialRampToValueAtTime(
      end * variation,
      time + duration * (event === "block" ? 1.5 : 0.8),
    );
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(level, time + 0.006);
    envelope.gain.exponentialRampToValueAtTime(
      0.0001,
      time + duration * (event === "block" ? 1.55 : 0.9),
    );
    oscillator.connect(envelope);
    envelope.connect(output!);
    oscillator.start(time);
    oscillator.stop(time + duration * 1.6);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
  });
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
    bass.connect(output!);
    oscillator.start(now);
    oscillator.stop(now + 0.23);
    oscillator.onended = () => {
      oscillator.disconnect();
      bass.disconnect();
    };
  }
}

/**
 * Boss cues use different frequency bands so a player can identify the move
 * before it lands: high metal for darts, sub pulses for the hammer, a broad
 * air cut for the sweep, and a resonant low wave for the shock ring.
 */
function bossCue(event: SoundEvent) {
  if (!context || !output) return;
  const ctx = context, outputNode = output, now = ctx.currentTime;
  const tone = (
    start: number, end: number, duration: number, level: number,
    type: OscillatorType = "sine", delay = 0,
  ) => {
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    const time = now + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(start, time);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, end), time + duration);
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    oscillator.connect(gain); gain.connect(outputNode);
    oscillator.start(time); oscillator.stop(time + duration + .02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  };
  switch (event) {
    case "bossDartCharge":
      tone(240, 1280, .52, .052, "sawtooth");
      tone(480, 1920, .44, .024, "triangle", .07);
      break;
    case "bossDartFire":
      tone(1640, 430, .13, .075, "square");
      tone(260, 105, .18, .05, "triangle", .018);
      break;
    case "bossSlamCharge":
      [0, .21, .42].forEach((delay, index) =>
        tone(82 + index * 9, 42, .16, .075 + index * .025, "sine", delay));
      break;
    case "slam":
      tone(72, 25, .42, .22, "sine");
      tone(195, 44, .22, .08, "triangle", .018);
      break;
    case "bossSweepCharge":
      tone(135, 780, .43, .045, "sawtooth");
      break;
    case "bossSweepStrike":
      tone(680, 105, .2, .075, "sawtooth");
      tone(125, 48, .23, .1, "sine", .015);
      break;
    case "bossWaveCharge":
      tone(96, 184, .56, .055, "triangle");
      tone(48, 72, .6, .045, "sine");
      break;
    case "bossWaveRelease":
      tone(190, 36, .48, .12, "triangle");
      break;
    case "summon":
      [138, 184, 276, 414].forEach((frequency, index) =>
        tone(frequency * .76, frequency, .27, .038, "triangle", index * .095));
      break;
    case "bossDefeat":
      tone(164, 54, .65, .105, "sine");
      tone(620, 196, .5, .04, "triangle", .08);
      break;
  }
}
export function playSound(event: SoundEvent) {
  if (!enabled || !context) return;
  const bossEvent = [
    "bossDartCharge", "bossDartFire", "bossSlamCharge", "bossSweepCharge",
    "bossSweepStrike", "bossWaveCharge", "bossWaveRelease", "bossDefeat", "summon",
  ].includes(event);
  if (bossEvent) {
    bossCue(event);
    if (output) void playSampledSfx(context, output, event);
    return;
  }
  if (event === "slam") {
    impactSound(event);
    bossCue(event);
    return;
  }
  if (event === "heal") {
    healingSound();
    // Keep the physical potion/herb sound when the small CC0 clip is ready,
    // while the synthesized chime above guarantees immediate feedback.
    if (output) void playSampledSfx(context, output, event);
    return;
  }
  if (output && playSampledSfx(context, output, event)) return;
  if (event === "charge") {
    chargeReadySound();
    return;
  }
  if (
    ["sword", "spin", "hit", "heavy", "slam", "block", "hurt", "break", "fistSwing", "punchHit", "kickHit"].includes(event)
  ) {
    impactSound(event);
    return;
  }
  const notes: Partial<Record<SoundEvent, number[]>> = {
    itemReveal: PICKUP_NOTES,
    arrow: [420, 160],
    gem: [880, 1320],
    defeat: [294, 247, 196],
    door: [330, 440, 660],
    win: [392, 494, 587, 784],
  };
  notes[event]?.forEach((frequency, i) => {
    const oscillator = context!.createOscillator(),
      gain = context!.createGain(),
      t = context!.currentTime + i * (event === 'itemReveal' ? .17 : .09);
    const duration = event === 'itemReveal' ? (i === 4 ? .6 : .28) : .2;
    oscillator.type = event === 'itemReveal' ? 'triangle' : "sine";
    oscillator.frequency.setValueAtTime(frequency, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.045, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    oscillator.connect(gain);
    gain.connect(output!);
    oscillator.start(t);
    oscillator.stop(t + duration + .02);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  });
}

export function syncActionAudio(
  active: boolean,
  drawing: boolean,
  spinning: boolean,
  charging = false,
) {
  if (context) {
    syncSampledSfx(context, active && enabled, drawing, spinning);
    syncChargeLoop(active && enabled && charging);
  }
}

let rotor:
  | {
      gain: GainNode;
      sources: (OscillatorNode | AudioBufferSourceNode)[];
      nodes: AudioNode[];
    }
  | undefined;
/** Continuous engine and blade-beat synthesis; fade with approach/departure. */
export function rotorSound(remaining: number | null) {
  if (!context) return;
  const ctx = context;
  const t = remaining === null ? INTRO_DURATION : INTRO_DURATION - remaining;
  const level =
    enabled && remaining !== null
      ? 0.2 *
        Math.min(1, 0.2 + t / 4) *
        introPose(remaining).rotorSpeed
      : 0;
  if (!rotor && level > 0) {
    const master = ctx.createGain(),
      rumble = ctx.createOscillator(),
      engine = ctx.createOscillator(),
      blade = ctx.createOscillator(),
      pulse = ctx.createGain(),
      amplitude = ctx.createGain(),
      filter = ctx.createBiquadFilter();
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate),
      d = buffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const air = ctx.createBufferSource();
    air.buffer = buffer;
    air.loop = true;
    master.gain.value = 0;
    rumble.type = "triangle";
    rumble.frequency.value = 82;
    engine.type = "sawtooth";
    engine.frequency.value = 123;
    blade.frequency.value = 18;
    pulse.gain.value = 0.18;
    amplitude.gain.value = 0.25;
    filter.type = "lowpass";
    filter.frequency.value = 480;
    filter.Q.value = 0.8;
    rumble.connect(filter);
    engine.connect(filter);
    air.connect(filter);
    filter.connect(amplitude);
    blade.connect(pulse);
    pulse.connect(amplitude.gain);
    amplitude.connect(master);
    master.connect(output!);
    const sources = [rumble, engine, blade, air];
    sources.forEach((s) => s.start());
    rotor = {
      gain: master,
      sources,
      nodes: [master, pulse, amplitude, filter],
    };
  }
  rotor?.gain.gain.setTargetAtTime(level, ctx.currentTime, 0.08);
  if (rotor && remaining === null && rotor.gain.gain.value < .001) {
    rotor.sources.forEach(s => { s.stop(); s.disconnect(); });
    rotor.nodes.forEach(n => n.disconnect());
    rotor = undefined;
  }
}
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    rotor?.sources.forEach((s) => {
      s.stop();
      s.disconnect();
    });
    rotor?.nodes.forEach((n) => n.disconnect());
  });
