import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
} from "three";
import { ensureNormalUVs, surfaceFor } from "../src/game/materials";

test("missing UV projection is non-degenerate on every box face and shared safely", () => {
  const source = new BoxGeometry();
  source.deleteAttribute("uv");
  const mesh = new Mesh(source),
    other = new Mesh(source);
  ensureNormalUVs(mesh);
  ensureNormalUVs(other);
  assert.equal(source.getAttribute("uv"), undefined);
  assert.equal(mesh.geometry, other.geometry);
  const uv = mesh.geometry.getAttribute("uv");
  for (let i = 0; i < uv.count; i += 3) {
    const area =
      (uv.getX(i + 1) - uv.getX(i)) * (uv.getY(i + 2) - uv.getY(i)) -
      (uv.getY(i + 1) - uv.getY(i)) * (uv.getX(i + 2) - uv.getX(i));
    assert.ok(Math.abs(area) > 0);
  }
});
test("projection handles tied dominant axes; authored UVs remain untouched", () => {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute([0, 0, 0, 1, -1, 0, 0, 0, 1], 3),
  );
  const mesh = new Mesh(geometry);
  ensureNormalUVs(mesh);
  const uv = mesh.geometry.getAttribute("uv");
  assert.ok(
    Math.abs(
      (uv.getX(1) - uv.getX(0)) * (uv.getY(2) - uv.getY(0)) -
        (uv.getY(1) - uv.getY(0)) * (uv.getX(2) - uv.getX(0)),
    ) > 0,
  );
  const authored = new Mesh(new BoxGeometry());
  const original = authored.geometry;
  ensureNormalUVs(authored);
  assert.equal(authored.geometry, original);
});
test("named asset materials select their physical surface", () => {
  for (const [name, surface] of Object.entries({
    Adventure_steel: "metal",
    gold: "gold",
    leather: "leather",
    trunk: "bark",
    grass: "grass",
    roof: "roof",
    Trump_hairlight: "hair",
    "Ivory upper fuselage": "paint",
    "Titanium rotor hub": "metal",
    "Rubber and rotor": "rubber",
    rug: "carpet",
  })) {
    assert.equal(surfaceFor(name), surface);
  }
});
