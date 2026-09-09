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
let source: MusicSource = "suno";
try {
  if (localStorage.getItem("legend-music-source") === "ocarina")
    source = "ocarina";
} catch {
  /* Storage may be unavailable. */
}
let notice = "";
export function getMusicSettings() {
  return { source, notice };
}
let tracks: HTMLAudioElement[] = [];
function releaseTracks() {
  tracks.forEach((t) => {
    t.onerror = null;
    t.pause();
    t.removeAttribute("src");
    t.load();
  });
  tracks = [];
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
  if (enabled && unlocked) startTracks();
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
  else if (unlocked) startTracks();
}
function startTracks() {
  const current = tracks[musicTrack(phase, battle)];
  if (current?.paused) void current.play().catch(() => {});
}
export function unlockMusic() {
  if (!tracks.length) createTracks();
  unlocked = true;
  if (enabled) startTracks();
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
          ? level * getAudioSettings().music * Math.max(0, edge)
          : 0;
      a.volume = Math.max(
        0,
        Math.min(1, a.volume + (target - a.volume) * 0.12),
      );
      if (i !== chosen && a.volume < 0.001 && !a.paused) a.pause();
    });
  }, 50);
}
export function musicPhase(value: Phase, inBattle = false, introElapsed = 0) {
  const previous = musicTrack(phase, battle);
  const next = musicTrack(value, inBattle);
  if (previous !== next && tracks.length) tracks[next].currentTime = 0;
  phase = value;
  battle = inBattle;
  if (previous !== next && enabled && unlocked) startTracks();
  const arrival = tracks[3];
  if (arrival && value === "intro") {
    // Follow simulation time even after a hidden tab, lag, or a mute toggle.
    if (Math.abs(arrival.currentTime - introElapsed) > 0.25)
      arrival.currentTime = Math.max(0, introElapsed);
    if (previous !== next && enabled && unlocked)
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
