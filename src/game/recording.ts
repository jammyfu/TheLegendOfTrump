import {
  appendRecord,
  checkpointId,
  listRecords,
  type Checkpoint,
} from "./checkpoints";
import { game, Simulation } from "./simulation";

type Input = Parameters<Simulation["update"]>[1];
type Frame = {
  dt: number;
  input: Input;
  commands: { name: string; args: unknown[] }[];
  changes: Record<string, unknown>;
  events: Simulation["events"];
};
export type RecordingChunk = {
  id: string;
  schema: 1;
  session: string;
  sequence: number;
  createdAt: number;
  initial: Checkpoint;
  frames: Frame[];
};
export type RecordingRecord =
  | RecordingChunk
  | {
      id: string;
      schema: 1;
      session: string;
      sequence: number;
      createdAt: number;
      frameCount: number;
      encoding: "gzip-json";
      data: Blob;
    };
export const recordingFrameCount = (record: RecordingRecord) =>
  "frames" in record ? record.frames.length : record.frameCount;

// State-assisted replay: inputs remain inspectable, while authoritative deltas
// preserve AI/random outcomes without rerunning a potentially changed engine.
const fingerprint = (value: unknown) =>
  JSON.stringify(value, (_key, v) =>
    v === undefined
      ? { $undefined: true }
      : Object.is(v, -0)
        ? { $negativeZero: true }
        : v instanceof Set
          ? { $set: [...v] }
          : v instanceof Map
            ? { $map: [...v] }
            : v,
  );

export async function packRecording(
  chunk: RecordingChunk,
): Promise<RecordingRecord> {
  if (typeof CompressionStream === "undefined") return chunk;
  const data = await new Response(
    new Blob([fingerprint(chunk)])
      .stream()
      .pipeThrough(new CompressionStream("gzip")),
  ).blob();
  return {
    id: chunk.id,
    schema: 1,
    session: chunk.session,
    sequence: chunk.sequence,
    createdAt: chunk.createdAt,
    frameCount: chunk.frames.length,
    encoding: "gzip-json",
    data,
  };
}
export async function unpackRecording(
  record: RecordingRecord,
): Promise<RecordingChunk> {
  if ("frames" in record) return record;
  if (record.encoding !== "gzip-json") throw new Error("不支持的操作记录格式");
  const json = await new Response(
    record.data.stream().pipeThrough(new DecompressionStream("gzip")),
  ).text();
  const decode = (v: any): any => {
    if (!v || typeof v !== "object") return v;
    if (v.$undefined === true) return undefined;
    if (v.$negativeZero === true) return -0;
    if (Array.isArray(v.$set)) return new Set(v.$set.map(decode));
    if (Array.isArray(v.$map)) return new Map(v.$map.map(decode));
    if (Array.isArray(v)) return v.map(decode);
    return Object.fromEntries(
      Object.entries(v).map(([key, value]) => [key, decode(value)]),
    );
  };
  return decode(JSON.parse(json));
}

export class Recorder {
  playing = false;
  paused = false;
  status = "";
  position = 0;
  duration = 0;
  private session = checkpointId();
  private sequence = 0;
  private frames: Frame[] = [];
  private initial: Checkpoint | null = null;
  private previous = new Map<string, string | undefined>();
  private commands: Frame["commands"] = [];
  private seconds = 0;
  private playback: Frame[] = [];
  private cursor = 0;
  private budget = 0;
  private pending: Promise<void> = Promise.resolve();
  private returnState: Checkpoint | null = null;
  private originalUpdate: Simulation["update"];
  constructor(
    private sim: Simulation,
    private writer = async (chunk: RecordingChunk) =>
      appendRecord(await packRecording(chunk), "recordings"),
  ) {
    this.originalUpdate = sim.update.bind(sim);
    sim.update = (dt, input) => {
      if (this.playing) {
        this.tick(dt);
        return;
      }
      const active = !["title", "paused", "won", "lost"].includes(sim.phase);
      if (active && !this.initial) this.begin();
      this.originalUpdate(dt, input);
      if (active) this.capture(dt, input);
      if (["title", "paused", "lost", "won"].includes(sim.phase))
        void this.flush();
    };
    const names = [
      "pressAttack",
      "releaseAttack",
      "cancelCharge",
      "attack",
      "jump",
      "dodge",
      "startRush",
      "interact",
      "usePotion",
      "switchWeapon",
      "toggleLock",
      "cycleTarget",
      "look",
      "zoom",
      "pause",
      "start",
      "retry",
      "beginIntro",
      "skipIntro",
      "returnToTitle",
      "selectDifficulty",
    ] as const;
    for (const name of names) {
      const original = sim[name].bind(sim) as (...args: unknown[]) => unknown;
      Object.assign(sim, {
        [name]: (...args: unknown[]) => {
          if (this.playing) return;
          this.commands.push({ name, args: structuredClone(args) });
          return original(...args);
        },
      });
    }
  }
  private begin() {
    this.initial = this.sim.createCheckpoint("before", []);
    this.previous = new Map(
      Object.entries(this.initial.state).map(([k, v]) => [k, fingerprint(v)]),
    );
  }
  private capture(dt: number, input: Input) {
    const state = this.sim.createCheckpoint("before", []).state;
    const changes: Frame["changes"] = {};
    for (const [key, value] of Object.entries(state)) {
      const encoded = fingerprint(value);
      if (this.previous.get(key) !== encoded) changes[key] = value;
      this.previous.set(key, encoded);
    }
    this.frames.push({
      dt,
      input: { ...input },
      commands: this.commands.splice(0),
      changes,
      events: [...this.sim.events],
    });
    this.seconds += dt;
    if (this.seconds >= 5) void this.flush();
  }
  flush() {
    if (!this.frames.length || !this.initial) return this.pending;
    const chunk: RecordingChunk = {
      id: checkpointId(),
      schema: 1,
      session: this.session,
      sequence: this.sequence++,
      createdAt: Date.now(),
      initial: this.initial,
      frames: this.frames,
    };
    this.frames = [];
    this.seconds = 0;
    this.initial = null;
    this.pending = this.pending
      .then(() => this.writer(chunk))
      .catch(() => {
        if (!this.status)
          this.sim.notify("操作记录保存失败，请检查浏览器存储空间");
        this.status = "操作记录保存失败，请检查浏览器存储空间";
      });
    return this.pending;
  }
  async list() {
    await this.flush();
    return listRecords<RecordingRecord>("recordings");
  }
  async play(records: RecordingRecord[]) {
    await this.flush();
    const chunks = await Promise.all(records.map(unpackRecording));
    const ordered = [...chunks].sort((a, b) => a.sequence - b.sequence);
    if (
      !ordered.length ||
      ordered.some(
        (c, i) =>
          c.schema !== 1 ||
          c.sequence !== i ||
          c.session !== ordered[0].session ||
          !Array.isArray(c.frames),
      )
    )
      throw new Error("不支持的操作记录");
    // A full snapshot at each chunk boundary also captures actions during menus.
    const frames = ordered.flatMap((c) =>
      c.frames.map((f, i) => ({
        ...f,
        changes: i === 0 ? { ...c.initial.state, ...f.changes } : f.changes,
      })),
    );
    if (frames.some((f) => !Number.isFinite(f.dt) || f.dt <= 0 || f.dt > 0.2))
      throw new Error("操作记录损坏");
    const returnState = this.sim.createCheckpoint("before", []);
    this.sim.loadCheckpoint(ordered[0].initial);
    this.returnState = returnState;
    this.playback = frames;
    this.position = 0;
    this.duration = frames.reduce((n, f) => n + f.dt, 0);
    this.cursor = 0;
    this.budget = 0;
    this.paused = false;
    this.playing = true;
  }
  private tick(dt: number) {
    if (this.paused) return;
    this.budget += dt;
    while (
      this.cursor < this.playback.length &&
      this.budget >= this.playback[this.cursor].dt
    ) {
      const frame = this.playback[this.cursor++];
      this.budget -= frame.dt;
      this.position += frame.dt;
      for (const [key, value] of Object.entries(frame.changes)) {
        if (key === "boss") {
          const boss = value as Record<string, unknown>;
          for (const k of Object.keys(this.sim.boss))
            Object.assign(this.sim.boss, { [k]: structuredClone(boss[k]) });
        } else if (
          Object.hasOwn(this.sim, key) &&
          typeof (this.sim as unknown as Record<string, unknown>)[key] !==
            "function" &&
          !key.startsWith("checkpoint") &&
          key !== "debug"
        )
          Object.assign(this.sim, { [key]: structuredClone(value) });
      }
      this.sim.events = [...frame.events];
      this.sim.version++;
    }
    if (this.cursor === this.playback.length) this.paused = true;
  }
  stop() {
    if (!this.playing) return;
    this.playing = false;
    if (this.returnState) {
      // Restore the exact pre-replay world, including title/death screens.
      const phase = this.returnState.state.phase;
      const hp = this.returnState.state.hp;
      this.sim.loadCheckpoint({
        ...this.returnState,
        state: { ...this.returnState.state, hp: Math.max(0.5, Number(hp)) },
      });
      this.sim.hp = Number(hp);
      if (phase !== "playing") this.sim.phase = phase as Simulation["phase"];
    }
    this.playback = [];
    this.returnState = null;
    this.commands = [];
  }
}

export const recorder =
  typeof indexedDB === "undefined" ? null : new Recorder(game);
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    void recorder?.flush();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) void recorder?.flush();
  });
}
