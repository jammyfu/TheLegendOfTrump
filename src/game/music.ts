import { getAudioSettings } from "./audioSettings";
import { musicTrack } from "./combatMusic";
import { INTRO_DURATION } from "./intro";
import type { Phase } from "./simulation";
export type MusicSource = "suno" | "ocarina";
export const soundtrackAlbum =
  "https://downloads.khinsider.com/game-soundtracks/album/legend-of-zelda-the-ocarina-of-time-original-sound-track-1998";
const originalTracks = [
  "title.mp3",
  "exploration.mp3",
  "boss.mp3",
  "arrival.mp3",
];
const localTracks = ["title.mp3", "exploration.mp3", "boss.mp3", "arrival.wav"];
let source: MusicSource = "ocarina";
try {
  if (localStorage.getItem("legend-music-source") === "suno")
    source = "suno";
} catch {
  /* Storage may be unavailable. */
}
let notice = "";
export function getMusicSettings() {
  return { source, notice };
}
let tracks: HTMLAudioElement[] = [];
let preloadTimer: ReturnType<typeof setTimeout> | undefined;
let preloadGeneration = 0;
let musicStartTimer: ReturnType<typeof setTimeout> | undefined;
let musicStarted = false;
type TrackLike = Pick<HTMLAudioElement, "pause" | "currentTime" | "volume">;
/** A retry starts from one clean music voice; no faded combat voice may survive. */
export function resetMusicTracks<T extends TrackLike>(trackSet: T[]) {
  trackSet.forEach((track) => {
    track.pause();
    track.volume = 0;
    track.currentTime = 0;
  });
}
function releaseTracks() {
  preloadGeneration++;
  if (preloadTimer) clearTimeout(preloadTimer);
  preloadTimer = undefined;
  if (musicStartTimer) clearTimeout(musicStartTimer);
  musicStartTimer = undefined;
  musicStarted = false;
  tracks.forEach((t) => {
    t.onerror = null;
    t.pause();
    t.removeAttribute("src");
    t.load();
  });
  tracks = [];
}

/**
 * Music is never part of the scene's critical path.  After the first user
 * gesture starts the active cue, hydrate one future cue at a time while the
 * player is already in-game.  Keeping a gap between requests prevents music
 * decode/network work from competing with the first rendered scene.
 */
function preloadFutureTracks() {
  if (!tracks.length || preloadTimer) return;
  const generation = ++preloadGeneration;
  const current = musicTrack(phase, battle);
  const queue = tracks.map((_, index) => index).filter((index) => index !== current);
  const loadNext = () => {
    preloadTimer = undefined;
    if (generation !== preloadGeneration || !queue.length) return;
    const index = queue.shift()!;
    const track = tracks[index];
    let settled = false;
    const settle = () => {
      if (settled || generation !== preloadGeneration) return;
      settled = true;
      track.removeEventListener("loadeddata", settle);
      track.removeEventListener("error", settle);
      // Leave the browser time to decode this short cue before requesting the
      // next one.  This is a background warm-up, never a loading gate.
      preloadTimer = setTimeout(loadNext, 750);
    };
    track.preload = "auto";
    track.addEventListener("loadeddata", settle, { once: true });
    track.addEventListener("error", settle, { once: true });
    track.load();
    // A stalled remote/local audio request must not hold up later cues.
    setTimeout(settle, 2500);
  };
  preloadTimer = setTimeout(loadNext, 850);
}

/** Delay the very first music request until the scene has had time to render.
 * This keeps title/start interaction, model decode and texture upload ahead of
 * optional audio bytes on constrained mobile connections. */
function startMusicInBackground(delay = 900) {
  if (!enabled || !unlocked || musicStarted || musicStartTimer) return;
  musicStartTimer = setTimeout(() => {
    musicStartTimer = undefined;
    if (!enabled || !unlocked || musicStarted) return;
    musicStarted = true;
    startTracks();
    preloadFutureTracks();
  }, delay);
}
function createTracks() {
  tracks = localTracks.map((name, i) => {
    const a = new Audio(
      source === "ocarina"
        ? import.meta.env.BASE_URL + `audio/ocarina/${originalTracks[i]}`
        : import.meta.env.BASE_URL + `audio/${name}`,
    );
    a.loop = i !== 3;
    a.preload = "none";
    a.volume = 0;
    if (source === "ocarina")
      a.onerror = () => {
        a.onerror = null;
        notice = "原版曲目暂时无法加载，当前曲目已改用 Suno 配乐。";
        a.src = import.meta.env.BASE_URL + `audio/${name}`;
        if (enabled && unlocked && musicTrack(phase, battle) === i)
          void a.play().catch(() => {});
      };
    return a;
  });
}
export function setMusicSource(value: MusicSource) {
  if (source === value) return;
  source = value;
  notice = "";
  try {
    localStorage.setItem("legend-music-source", value);
  } catch {
    /* Session selection still works. */
  }
  releaseTracks();
  createTracks();
  if (enabled && unlocked) startMusicInBackground(180);
}
let enabled = getAudioSettings().enabled,
  unlocked = false,
  phase: Phase = "title";
let battle = false;
let timer: ReturnType<typeof setInterval> | undefined;
export function musicEnabled(value: boolean) {
  enabled = value;
  if (!value)
    tracks.forEach((t) => {
      t.pause();
      t.volume = 0;
    });
  else if (unlocked) {
    if (musicStarted) startTracks();
    else startMusicInBackground();
  }
}
function startTracks() {
  const current = tracks[musicTrack(phase, battle)];
  if (current?.paused) void current.play().catch(() => {});
}
export function unlockMusic() {
  if (!tracks.length) createTracks();
  unlocked = true;
  startMusicInBackground();
  timer ??= setInterval(() => {
    tracks.forEach((a, i) => {
      const chosen = musicTrack(phase, battle);
      const level =
        phase === "paused"
          ? 0.09
          : phase === "intro"
            ? 0.32
            : battle
              ? 0.3
              : 0.22;
      const duration = i === 3 ? INTRO_DURATION : a.duration;
      const edge = Number.isFinite(duration)
        ? Math.min(
            1,
            a.currentTime / 0.5,
            Math.max(0, (duration - a.currentTime) / 0.7),
          )
        : 1;
      const target =
        enabled && i === chosen && !document.hidden
          ? level * getAudioSettings().music * Math.max(0, edge) * (phase === 'obtaining' ? .24 : 1)
          : 0;
      a.volume = Math.max(
        0,
        Math.min(1, a.volume + (target - a.volume) * (phase === 'obtaining' ? .45 : .12)),
      );
      if (i !== chosen && a.volume < 0.001 && !a.paused) a.pause();
    });
  }, 50);
}
export function musicPhase(value: Phase, inBattle = false, introElapsed = 0) {
  const previous = musicTrack(phase, battle);
  const next = musicTrack(value, inBattle);
  const retrying = (phase === "dying" || phase === "lost") && value === "playing";
  if (retrying && tracks.length) resetMusicTracks(tracks);
  if (previous !== next && tracks.length) {
    // WeChat may retain an HTMLAudio stream through the next render frame.
    // Stop the outgoing title track before the next scene track begins.
    const outgoing = tracks[previous];
    outgoing?.pause();
    if (outgoing) {
      outgoing.currentTime = 0;
      outgoing.volume = 0;
    }
    tracks[next].currentTime = 0;
  }
  phase = value;
  battle = inBattle;
  if ((previous !== next || retrying) && enabled && unlocked && musicStarted)
    startTracks();
  const arrival = tracks[3];
  if (arrival && value === "intro") {
    // Follow simulation time even after a hidden tab, lag, or a mute toggle.
    if (Math.abs(arrival.currentTime - introElapsed) > 0.25)
      arrival.currentTime = Math.max(0, introElapsed);
    if (previous !== next && enabled && unlocked && musicStarted)
      void arrival.play().catch(() => {});
  } else if (arrival && previous === 3) {
    arrival.pause();
    arrival.currentTime = 0;
    arrival.volume = 0;
  }
}
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    if (timer) clearInterval(timer);
    tracks.forEach((t) => {
      t.pause();
      t.removeAttribute("src");
      t.load();
    });
  });
