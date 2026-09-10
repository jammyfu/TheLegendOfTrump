import { test, expect } from "@playwright/test";

test("combat recordings decode and all selected events produce bounded voices", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const moduleUrl = "/src/game/sampledSfx.ts";
    const { preloadSfx, playSampledSfx, syncSampledSfx, SFX_SAMPLES } = await import(moduleUrl);
    const ctx = new AudioContext();
    const output = ctx.createGain();
    output.gain.value = 0; // Validate decoded buffers without playing into the user's speakers.
    output.connect(ctx.destination);
    await preloadSfx(ctx);
    const buffers: { duration: number; peak: number }[] = [];
    const create = ctx.createBufferSource.bind(ctx);
    ctx.createBufferSource = () => {
      const source = create();
      const start = source.start.bind(source);
      source.start = (...args) => {
        buffers.push({ duration: source.buffer!.duration,
          peak: source.buffer!.getChannelData(0).reduce((p, v) => Math.max(p, Math.abs(v)), 0) });
        start(...args);
      };
      return source;
    };
    const events = Object.keys(SFX_SAMPLES);
    const played: boolean[] = [];
    for (const event of events) {
      const before = buffers.length;
      played.push(playSampledSfx(ctx, output, event) && buffers.length > before);
      syncSampledSfx(ctx, false, false, false);
    }
    const beforeBurst = buffers.length;
    for (let i = 0; i < 40; i++) playSampledSfx(ctx, output, "sword");
    await ctx.close();
    return { played, buffers, beforeBurst };
  });
  expect(result.played.every(Boolean)).toBe(true);
  expect(result.buffers.length - result.beforeBurst).toBeLessThanOrEqual(1);
  expect(result.buffers.every(b => b.duration > .1 && b.duration < 1 && b.peak > .001 && b.peak <= .751)).toBe(true);
});

test("bow release and pause stop the matching active and delayed voices", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const moduleUrl = "/src/game/sampledSfx.ts";
    const { preloadSfx, playSampledSfx, syncSampledSfx } = await import(moduleUrl);
    const ctx = new AudioContext();
    const gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination);
    await preloadSfx(ctx);
    let stops = 0;
    const create = ctx.createBufferSource.bind(ctx);
    ctx.createBufferSource = () => {
      const source = create(), stop = source.stop.bind(source);
      source.stop = (...args) => { stops++; stop(...args); };
      return source;
    };
    playSampledSfx(ctx, gain, "bowDraw");
    syncSampledSfx(ctx, true, true, false);
    const holding = stops;
    syncSampledSfx(ctx, true, false, false);
    const released = stops;
    playSampledSfx(ctx, gain, "spin");
    syncSampledSfx(ctx, false, false, false);
    await ctx.close();
    return { holding, released, stops };
  });
  expect(result).toEqual({ holding: 0, released: 1, stops: 3 });
});
