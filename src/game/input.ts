import { game } from "./simulation";
import { unlockAudio } from "./audio";
export const keys = new Set<string>();
export const joystick = { x: 0, z: 0 };
export function clearInput() {
  keys.clear();
  joystick.x = 0;
  joystick.z = 0;
}
export function getInput() {
  return {
    x:
      (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
      (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) +
      joystick.x,
    z:
      (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) -
      (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) +
      joystick.z,
    sprint: keys.has("ShiftLeft") || keys.has("ShiftRight"),
  };
}
export function bindInput() {
  const down = (e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLElement &&
      ["INPUT", "TEXTAREA"].includes(e.target.tagName)
    )
      return;
    if (
      ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
        e.code,
      )
    )
      e.preventDefault();
    keys.add(e.code);
    if (e.repeat) return;
    unlockAudio();
    if (game.phase === "intro" && ["Enter", "KeyE", "Space"].includes(e.code)) {
      game.skipIntro();
      return;
    }
    if (game.phase === "title" && e.code === "Enter") {
      game.beginIntro();
      return;
    }
    if (e.code === "Escape") {
      game.pause();
      clearInput();
    }
    if (e.code === "KeyE") game.interact();
    if (e.code === "Space" || e.code === "KeyJ") game.attack();
    if (e.code === "KeyR") game.cameraYaw = 0;
  };
  const up = (e: KeyboardEvent) => keys.delete(e.code);
  const blur = () => {
    clearInput();
    if (game.phase === "playing") game.pause();
  };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", blur);
  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", blur);
    clearInput();
  };
}
