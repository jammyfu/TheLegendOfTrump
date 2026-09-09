import test from "node:test";
import assert from "node:assert/strict";
import { BoxGeometry, Mesh, MeshStandardMaterial } from "three";
import { ensureSurfaceUVs } from "../src/game/surfaceUV";
import { surfaceFor, SURFACES } from "../src/game/surfaceCatalog";
import { existsSync } from "node:fs";
test("all 32 surface categories have actual color and roughness files", () => {
  for (const s of SURFACES) {
    assert.ok(existsSync(`public/textures/bright-materials/${s}-color.webp`), s);
    assert.ok(existsSync(`public/textures/bright-materials/${s}-roughness.png`), s);
  }
});
test("72 by 6 meter mown strip preserves physical texture proportions", () => {
  const source = new BoxGeometry(1,1,1), mesh = new Mesh(source, new MeshStandardMaterial());
  mesh.scale.set(72,0.012,6);
  ensureSurfaceUVs(mesh,"grass");
  const uv = mesh.geometry.getAttribute("uv");
  // BoxGeometry top face occupies vertices 12..17 after unindexing.
  const us = Array.from({length:6},(_,i)=>uv.getX(12+i));
  const vs = Array.from({length:6},(_,i)=>uv.getY(12+i));
  assert.equal(Math.max(...us)-Math.min(...us),18);
  assert.equal(Math.max(...vs)-Math.min(...vs),1.5);
  assert.equal(source.getAttribute("uv").count,24);
});
test("object purpose overrides ambiguous material names", () => {
  assert.equal(surfaceFor("grass","Mown lawn stripe"),"grass");
  assert.equal(surfaceFor("dark","Garden soil"),"soil");
  assert.equal(surfaceFor("grass","Garden crosswalk"),"paving");
  assert.equal(surfaceFor("rug"),"carpet");
  assert.equal(surfaceFor("Trump_suit"),"fabric");
  assert.equal(surfaceFor("Adventure_blue"),"paint");
  assert.equal(surfaceFor("road"),"road");
  assert.equal(surfaceFor("leaf", "Canvas tent"), "canvas");
});
