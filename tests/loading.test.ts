import assert from "node:assert/strict";
import test from "node:test";
import { DefaultLoadingManager, LoadingManager } from "three";
import * as loading from "../src/game/loading";

test("a drained network batch cannot dismiss the loader before the scene is ready", () => {
  DefaultLoadingManager.itemStart("hero.glb");
  DefaultLoadingManager.itemEnd("hero.glb");
  assert.equal(loading.getLoadingState().active, true);
});

test("resources discovered inside the same batch update the total immediately", () => {
  const before = loading.getLoadingState().total;
  DefaultLoadingManager.itemStart("wood.png");
  DefaultLoadingManager.itemStart("normal.png");
  assert.equal(loading.getLoadingState().total, before + 2);
  DefaultLoadingManager.itemEnd("wood.png");
  DefaultLoadingManager.itemEnd("normal.png");
});

test("a failed resource is not treated as successfully completed", () => {
  DefaultLoadingManager.itemStart("missing.glb");
  DefaultLoadingManager.itemError("missing.glb");
  DefaultLoadingManager.itemEnd("missing.glb");
  assert.equal(loading.getLoadingState().active, true);
  assert.equal(loading.getLoadingState().error, "missing.glb");
});

test("rendering before textures finish cannot certify the final scene", () => {
  const manager = new LoadingManager();
  const tracker = loading.trackLoading(manager);
  manager.itemStart("texture.png");
  tracker.interfaceReady();
  tracker.sceneReady();
  manager.itemEnd("texture.png");
  assert.equal(tracker.getState().active, true);
  tracker.sceneReady();
  assert.equal(tracker.getState().active, false);
});

test("ready requires decoded UI too, with no minimum timer and no reopening", () => {
  const manager = new LoadingManager();
  const tracker = loading.trackLoading(manager);
  manager.itemStart("scene.glb");
  manager.itemEnd("scene.glb");
  tracker.sceneReady();
  assert.equal(tracker.getState().stage, "interface");
  tracker.interfaceReady();
  assert.equal(tracker.getState().stage, "ready");
  manager.itemStart("optional-later.png");
  assert.equal(tracker.getState().active, false);
});

test("fully cached startup needs no network events", () => {
  const tracker = loading.trackLoading(new LoadingManager());
  tracker.interfaceReady();
  tracker.sceneReady();
  assert.equal(tracker.getState().active, false);
});

test("observer preserves existing loading manager callbacks and unsubscribes", () => {
  let finished = 0,
    notified = 0;
  const manager = new LoadingManager(() => {
    finished++;
  });
  const tracker = loading.trackLoading(manager);
  const unsubscribe = tracker.subscribe(() => {
    notified++;
  });
  manager.itemStart("first.glb");
  assert.equal(notified, 1);
  unsubscribe();
  manager.itemEnd("first.glb");
  assert.equal(notified, 1);
  assert.equal(finished, 1);
});
