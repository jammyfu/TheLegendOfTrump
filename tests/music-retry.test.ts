import test from "node:test";
import assert from "node:assert/strict";
import { resetMusicTracks } from "../src/game/music";
import {musicTrack} from '../src/game/combatMusic';
test('victory overrides battle and uses a cue distinct from failure and exploration',()=>{
 assert.equal(musicTrack('won',true),5);
 assert.equal(musicTrack('won',false),5);
 assert.notEqual(musicTrack('won',false),musicTrack('lost',false));
});
test('death and loss use the same dedicated cue regardless of combat; retry leaves it',()=>{
 for(const battle of [true,false]){
  assert.equal(musicTrack('dying',battle),4);
  assert.equal(musicTrack('lost',battle),4);
 }
 assert.notEqual(musicTrack('playing',false),4);
});

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
