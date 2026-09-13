import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/simulation.ts";
import {
  Recorder,
  packRecording,
  unpackRecording,
  type RecordingChunk,
} from "../src/game/recording.ts";
import type { Checkpoint } from "../src/game/checkpoints.ts";
const idle = { x: 0, z: 0, sprint: false };
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("checkpoint round trip retains world, collections, and boss methods without aliasing", () => {
  const g = new Simulation();
  g.start();
  g.coins = 21;
  g.opened.add("test");
  const save = g.createCheckpoint("before", ["enemy"]);
  g.coins = 0;
  g.opened.clear();
  g.loadCheckpoint(save);
  assert.equal(g.coins, 21);
  assert.ok(g.opened.has("test"));
  assert.equal(g.phase, "paused");
  assert.equal(typeof g.boss.update, "function");
  g.opened.add("later");
  assert.ok(!(save.state.opened as Set<string>).has("later"));
  const x = g.x;
  assert.throws(() =>
    g.loadCheckpoint({ ...save, state: { ...save.state, x: NaN } }),
  );
  assert.equal(g.x, x);
});

test("autosave precedes encounter, appends defeat, and deduplicates encounter frames", async () => {
  const g = new Simulation();
  g.start();
  const saves: Checkpoint[] = [];
  g.checkpointWriter = async (save) => {
    saves.push(save);
  };
  const enemy = g.guards[0];
  g.guards = [enemy];
  g.x = enemy.x;
  g.z = enemy.z + 2;
  g.update(0.01, idle);
  await settle();
  assert.equal(saves.length, 1);
  assert.equal(saves[0].reason, "before");
  assert.equal(saves[0].elapsed, 0);
  g.update(0.01, idle);
  await settle();
  assert.equal(saves.length, 1);
  // Exercise a kill occurring within a simulation step, as all combat paths do.
  const internal = g as unknown as { step: () => void };
  internal.step = () => {
    enemy.hp = 0;
  };
  g.update(0.01, idle);
  await settle();
  assert.equal(saves.length, 2);
  assert.equal(saves[1].reason, "after");
  assert.notEqual(saves[0].id, saves[1].id);
  assert.ok((saves[0].state.guards as { hp: number }[])[0].hp > 0);
  assert.equal((saves[1].state.guards as { hp: number }[])[0].hp, 0);
});

test("storage errors do not interrupt simulation", async () => {
  const g = new Simulation();
  g.start();
  g.x = g.guards[0].x;
  g.z = g.guards[0].z;
  g.checkpointWriter = () => {
    throw new Error("quota");
  };
  assert.doesNotThrow(() => g.update(0.01, idle));
  await settle();
  assert.match(g.checkpointStatus, /失败/);
});

test("input and authoritative state replay survive structured storage and ignore live attacks", async () => {
  const g = new Simulation();
  g.start();
  const chunks: RecordingChunk[] = [];
  const r = new Recorder(g, async (chunk) => {
    chunks.push(structuredClone(chunk));
  });
  g.pressAttack();
  for (let i = 0; i < 20; i++) g.update(0.025, { ...idle, x: 1 });
  g.releaseAttack();
  g.boss.hp = 7;
  g.update(0.025, idle);
  const expected = {
    x: g.x,
    z: g.z,
    hp: g.hp,
    boss: g.boss.hp,
    elapsed: g.elapsed,
  };
  await r.flush();
  assert.ok(
    chunks[0].frames.some((f) =>
      f.commands.some((c) => c.name === "pressAttack"),
    ),
  );
  assert.ok(chunks[0].frames.some((f) => f.input.x === 1));
  g.x += 100;
  await r.play(chunks);
  const attack = g.attackTime;
  g.pressAttack();
  assert.equal(g.attackTime, attack);
  for (let i = 0; i < 30; i++) g.update(0.025, { ...idle, x: -1 });
  assert.deepEqual(
    { x: g.x, z: g.z, hp: g.hp, boss: g.boss.hp, elapsed: g.elapsed },
    expected,
  );
  assert.equal(r.paused, true);
  assert.equal(typeof g.boss.update, "function");
  r.stop();
  assert.equal(g.x, expected.x + 100);
  assert.equal(g.phase, "paused");
});

test("recording spans durable chunks, preserves state across boundaries, and refuses missing chunks", async () => {
  const g = new Simulation();
  g.start();
  g.guards = [];
  const chunks: RecordingChunk[] = [];
  const r = new Recorder(g, async (c) => {
    chunks.push(structuredClone(c));
  });
  for (let i = 0; i < 120; i++) g.update(0.05, { ...idle, x: 1 });
  const expected = g.x;
  await r.flush();
  assert.equal(chunks.length, 2);
  const packed = await packRecording(chunks[0]);
  assert.deepEqual(await unpackRecording(packed), chunks[0]);
  await assert.rejects(r.play([chunks[1]]));
  await r.play(chunks);
  for (let i = 0; i < 125; i++) g.update(0.05, idle);
  assert.equal(g.x, expected);
  assert.ok(r.paused);
  r.stop();
});

test("boss retry has a new encounter checkpoint and reload retains summons and equipment", async () => {
  const g = new Simulation();
  g.start();
  g.zone = "office";
  g.boss.reset("hard");
  g.difficulty = "hard";
  g.weapon = "bow";
  g.bowUnlocked = true;
  g.arrows = 12;
  g.x = 0;
  g.z = 12;
  const saves: Checkpoint[] = [];
  g.checkpointWriter = async (s) => {
    saves.push(s);
  };
  g.update(0.01, idle);
  await settle();
  assert.equal(saves[0].reason, "before");
  g.retry();
  g.update(0.01, idle);
  await settle();
  assert.equal(saves.length, 2);
  assert.notEqual(saves[0].run, saves[1].run);
  g.loadCheckpoint(saves[0]);
  assert.equal(g.zone, "office");
  assert.equal(g.weapon, "bow");
  assert.equal(g.arrows, 12);
  assert.equal(g.boss.difficulty, "hard");
});
