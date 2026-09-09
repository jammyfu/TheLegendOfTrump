import { performance } from "node:perf_hooks";
import { Simulation } from "../src/game/simulation";
// CPU-only repeatable scene, not a GPU or device-FPS benchmark.
const frames = 5000;
function run(count: number) {
  const game = new Simulation();
  game.start();
  game.x = -20;
  game.z = 15;
  const begin = performance.now();
  for (let i = 0; i < count; i++) {
    game.invincible = 10;
    game.update(1 / 60, { x: 0, z: 0, sprint: false });
  }
  return performance.now() - begin;
}
run(500);
const samples = Array.from({ length: 3 }, () => run(frames));
const median = [...samples].sort((a, b) => a - b)[1];
console.log(
  JSON.stringify(
    {
      frames,
      samplesMs: samples,
      medianMs: median,
      msPerUpdate: median / frames,
    },
    null,
    2,
  ),
);
