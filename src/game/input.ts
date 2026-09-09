import { game } from "./simulation";
import { unlockAudio } from "./audio";
export const keys = new Set<string>();
export const joystick = { x: 0, z: 0 };
const mouse = { guard: false };
export const held = { sprint: false, guard: false };
export function clearInput() {
  game.cancelCharge();
  game.jumpBuffer = 0;
  mouse.guard = false;
  keys.clear();
  joystick.x = 0;
  joystick.z = 0;
  held.sprint = false;
  held.guard = false;
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
    sprint: held.sprint || keys.has("ShiftLeft") || keys.has("ShiftRight"),
    guard: mouse.guard || held.guard || keys.has("KeyF"),
  };
}
export function releaseMouse() {
  if (document.pointerLockElement) document.exitPointerLock();
}
export function requestMouseLook() {
  if (game.phase !== "playing") return;
  const canvas = document.querySelector("canvas");
  if (!canvas) return;
  try {
    const request = canvas.requestPointerLock();
    request?.catch(() => game.notify("鼠标锁定不可用，可按住中键拖动视角"));
  } catch {
    game.notify("按住鼠标中键拖动视角");
  }
}
export function bindInput() {
  const down = (e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLElement &&
      ["INPUT", "TEXTAREA"].includes(e.target.tagName)
    )
      return;
    if (
      [
        "Space",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "ControlLeft",
        "ControlRight",
      ].includes(e.code)
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
      if (game.phase === "reading") game.phase = "playing";
      else game.pause();
      clearInput();
      releaseMouse();
    }
    if (e.code === "KeyE") game.interact();
    if (e.code === "Space") game.jump();
    if (e.code === "KeyJ") game.pressAttack();
    if (["ControlLeft", "ControlRight", "KeyK"].includes(e.code))
      game.dodge(getInput());
    if (e.code === "KeyQ") game.toggleLock();
    if (e.code === "KeyR") {
      game.cameraYaw = game.yaw - Math.PI;
      game.cameraPitch = 0.3;
    }
  };
  const up = (e: KeyboardEvent) => {
    keys.delete(e.code);
    if (e.code === "KeyJ") game.releaseAttack();
  };
  const blur = () => {
    clearInput();
    if (game.phase === "playing") game.pause();
    releaseMouse();
  };
  const mouseDown = (e: MouseEvent) => {
    if (game.phase !== "playing" || !(e.target instanceof HTMLCanvasElement))
      return;
    unlockAudio();
    if (e.button === 0) {
      game.pressAttack();
      if (!document.pointerLockElement) requestMouseLook();
    }
    if (e.button === 2) { e.preventDefault(); mouse.guard = true; }
  };
  const mouseUp = (e: MouseEvent) => {
    if (e.button === 0) game.releaseAttack();
    if (e.button === 2) mouse.guard = false;
  };
  const mouseMove = (e: MouseEvent) => {
    if (game.phase === "playing" && (document.pointerLockElement || e.target instanceof HTMLCanvasElement)) mouse.guard = !!(e.buttons & 2);
    if (
      game.phase === "playing" &&
      (document.pointerLockElement ||
        (e.buttons === 4 && e.target instanceof HTMLCanvasElement))
    )
      game.look(e.movementX, e.movementY);
  };
  const wheel = (e: WheelEvent) => {
    if (e.target instanceof HTMLCanvasElement && game.phase === "playing") {
      e.preventDefault();
      game.zoom(e.deltaY);
    }
  };
  const context = (e: MouseEvent) => {
    if (document.pointerLockElement || e.target instanceof HTMLCanvasElement || held.guard) e.preventDefault();
  };
  const lock = () => {
    if (!document.pointerLockElement) {
      clearInput();
      if (game.phase === "playing") game.pause();
    }
  };
  const visibility = () => {
    if (document.hidden) blur();
  };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", blur);
  window.addEventListener("mousedown", mouseDown);
  window.addEventListener("mouseup", mouseUp);
  window.addEventListener("mousemove", mouseMove);
  window.addEventListener("wheel", wheel, { passive: false });
  window.addEventListener("contextmenu", context);
  document.addEventListener("pointerlockchange", lock);
  document.addEventListener("visibilitychange", visibility);
  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", blur);
    window.removeEventListener("mousedown", mouseDown);
    window.removeEventListener("mouseup", mouseUp);
    window.removeEventListener("mousemove", mouseMove);
    window.removeEventListener("wheel", wheel);
    window.removeEventListener("contextmenu", context);
    document.removeEventListener("pointerlockchange", lock);
    document.removeEventListener("visibilitychange", visibility);
    clearInput();
  };
}
