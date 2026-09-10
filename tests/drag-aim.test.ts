import test from 'node:test';
import assert from 'node:assert/strict';
import { dragAimEdge } from '../src/game/dragAim';

test('drag aiming has a broad stable center and smoothly accelerates toward either edge', () => {
  for (const extent of [320, 900, 1440]) {
    assert.equal(dragAimEdge(extent / 2, extent), 0);
    const band = Math.min(96, extent * .16);
    assert.equal(dragAimEdge(band, extent), 0);
    assert.equal(dragAimEdge(extent - band, extent), 0);
    assert.ok(dragAimEdge(band * .75, extent) > dragAimEdge(band * .25, extent));
    assert.ok(Math.abs(dragAimEdge(band / 2, extent) + dragAimEdge(extent - band / 2, extent)) < 1e-10);
    assert.equal(dragAimEdge(-40, extent), -1);
    assert.equal(dragAimEdge(extent + 40, extent), 1);
  }
  assert.equal(dragAimEdge(2, 0), 0);
});
