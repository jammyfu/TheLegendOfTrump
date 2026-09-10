import test from "node:test";
import assert from "node:assert/strict";
import { resetMusicTracks } from "../src/game/music";

test("retry clears every old music voice before the new track starts", () => {
  const tracks = Array.from({ length: 4 }, (_, index) => ({
    currentTime: index + 3,
    volume: 0.2 + index / 10,
    pauses: 0,
    pause() { this.pauses++; },
  }));
  resetMusicTracks(tracks);
  for (const track of tracks) {
    assert.equal(track.pauses, 1);
    assert.equal(track.volume, 0);
    assert.equal(track.currentTime, 0);
  }
});
