import { game } from "./simulation";
import { unlockAudio } from "./audio";
export const keys = new Set<string>();
export const joystick = { x: 0, z: 0 };
const mouse = { guard: false };
let middleDrag = false,
  intentionalRelease = false;
export const held = { sprint: false, guard: false };
export function clearInput() {
  game.cancelCharge();
  game.jumpBuffer = 0;
  mouse.guard = false;
  middleDrag = false;
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
  middleDrag = false;
  intentionalRelease = !!document.pointerLockElement;
  if (document.pointerLockElement) document.exitPointerLock();
}
export function requestMouseLook() {
  releaseMouse();
  game.notify("按住鼠标中键拖动视角，松开停止 · 左键仅攻击");
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
        "Tab",
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
    if (
      game.lockTarget &&
      [
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ].includes(e.code)
    )
      game.dodge(getInput());
    if (e.code === "KeyE") game.interact();
    if (e.code === "Space") game.jump(getInput());
    if (e.code === "KeyJ") game.pressAttack();
    if (["ControlLeft", "ControlRight", "KeyK"].includes(e.code))
      game.dodge(getInput());
    if (e.code === "KeyH") game.usePotion();
    if (e.code === "KeyX") game.switchWeapon();
    if (e.code === "Tab") game.cycleTarget();
    if (e.code === "KeyQ") {
      game.toggleLock();
      if (game.mouseLookSuspended) releaseMouse();
    }
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
    }
    if (e.button === 1) {
      e.preventDefault();
      middleDrag = true;
      game.mouseLookSuspended = false;
    }
    if (e.button === 2) {
      e.preventDefault();
      mouse.guard = true;
    }
  };
  const mouseUp = (e: MouseEvent) => {
    if (e.button === 1) middleDrag = false;
    if (e.button === 0) game.releaseAttack();
    if (e.button === 2) mouse.guard = false;
  };
  const mouseMove = (e: MouseEvent) => {
    if (game.mouseLookSuspended) {
      if (document.pointerLockElement) releaseMouse();
      return;
    }
    if (
      game.phase === "playing" &&
      (document.pointerLockElement || e.target instanceof HTMLCanvasElement)
    )
      mouse.guard = !!(e.buttons & 2);
    if (game.phase === "playing" && middleDrag && (e.buttons & 4) !== 0)
      game.look(e.movementX, e.movementY);
  };
  const wheel = (e: WheelEvent) => {
    if (e.target instanceof HTMLCanvasElement && game.phase === "playing") {
      e.preventDefault();
      game.zoom(e.deltaY);
    }
  };
  const context = (e: MouseEvent) => {
    if (
      document.pointerLockElement ||
      e.target instanceof HTMLCanvasElement ||
      held.guard
    )
      e.preventDefault();
  };
  const lock = () => {
    if (document.pointerLockElement) {
      releaseMouse();
      return;
    }
    if (!document.pointerLockElement) {
      middleDrag = false;
      clearInput();
      if (!intentionalRelease && game.phase === "playing") game.pause();
      intentionalRelease = false;
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
