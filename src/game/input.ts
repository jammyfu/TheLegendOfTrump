import { game } from "./simulation";
import { unlockAudio } from "./audio";
export const keys = new Set<string>();
export const joystick = { x: 0, z: 0 };
const mouse = { guard: false };
let guardPointer: number | null = null;
let middleDrag = false,
  intentionalRelease = false;
export const held = { sprint: false, guard: false };
export function clearInput() {
  game.cancelCharge();
  game.jumpBuffer = 0;
  mouse.guard = false;
  guardPointer = null;
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
  // Own right-button input before compatibility mouse events or native menus.
  const pointerDown = (e: PointerEvent) => {
    if (e.button !== 2 || game.phase !== "playing" ||
        !(e.target instanceof HTMLCanvasElement)) return;
    e.preventDefault();
    guardPointer = e.pointerId;
    mouse.guard = true;
    e.target.setPointerCapture(e.pointerId);
    unlockAudio();
  };
  const pointerUp = (e: PointerEvent) => {
    if (e.pointerId !== guardPointer || e.button !== 2) return;
    guardPointer = null;
    mouse.guard = false;
  };
  const pointerCancel = (e: PointerEvent) => {
    if (e.pointerId !== guardPointer) return;
    guardPointer = null;
    mouse.guard = false;
  };
  const pointerChange = (e: PointerEvent) => {
    // Button chords produce pointermove with button=2, not pointerup/down.
    // Ordinary movement has button=-1 and must never clear a held guard.
    if (e.button !== 2) return;
    if ((e.buttons & 2) !== 0) pointerDown(e);
    else pointerUp(e);
  };
  const down = (e: KeyboardEvent) => {
    const target = e.target instanceof HTMLElement ? e.target : null;
    const editable = target?.closest(
      'input, textarea, select, [contenteditable="true"]',
    );
    if (editable && e.code !== "Escape") return;
    const control = target?.closest('button, a, summary, [role="button"]');
    // Menus retain native focus navigation and button activation. Only gameplay
    // owns movement keys; otherwise a held menu key can leak into the next phase.
    if (e.code === "Escape") {
      e.preventDefault();
      if (game.phase === "reading") game.phase = "playing";
      else game.pause();
      clearInput();
      releaseMouse();
      return;
    }
    if (control && ["Space", "Enter", "Tab"].includes(e.code)) return;
    if (game.phase !== "playing") {
      if (e.repeat) return;
      if (
        game.phase === "intro" &&
        ["Enter", "KeyE", "Space"].includes(e.code)
      ) {
        e.preventDefault();
        clearInput();
        game.skipIntro();
      } else if (game.phase === "title" && e.code === "Enter") {
        unlockAudio();
        clearInput();
        game.beginIntro();
      } else if (
        ["reading", "dialogue"].includes(game.phase) &&
        e.code === "KeyE"
      ) {
        clearInput();
        game.interact();
      }
      return;
    }
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
    // A shield hold takes priority over attack. This also avoids a left-click
    // from briefly starting a swing and dropping a held right-click guard.
    if (e.button === 0 && !(game.canGuard && getInput().guard)) {
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
    // Pointerup fires only when the last button is released. Releasing right
    // while left remains held still needs to end guard via mouseup.
    if (e.button === 2 && (e.buttons & 2) === 0) {
      guardPointer = null;
      mouse.guard = false;
    }
  };
  const mouseMove = (e: MouseEvent) => {
    if (game.mouseLookSuspended) {
      if (document.pointerLockElement) releaseMouse();
      return;
    }
    // Ordinary movement does not change defense. The captured pointer's
    // explicit button transitions, cancellation and clearInput own the hold.
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
      held.guard || mouse.guard
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
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
  window.addEventListener("pointerdown", pointerDown, true);
  window.addEventListener("pointerup", pointerUp, true);
  window.addEventListener("pointermove", pointerChange, true);
  window.addEventListener("pointercancel", pointerCancel, true);
  window.addEventListener("lostpointercapture", pointerCancel, true);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", blur);
  window.addEventListener("mousedown", mouseDown);
  window.addEventListener("mouseup", mouseUp);
  window.addEventListener("mousemove", mouseMove);
  window.addEventListener("wheel", wheel, { passive: false });
  window.addEventListener("contextmenu", context, true);
  document.addEventListener("pointerlockchange", lock);
  document.addEventListener("visibilitychange", visibility);
  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("pointerdown", pointerDown, true);
    window.removeEventListener("pointerup", pointerUp, true);
    window.removeEventListener("pointermove", pointerChange, true);
    window.removeEventListener("pointercancel", pointerCancel, true);
    window.removeEventListener("lostpointercapture", pointerCancel, true);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", blur);
    window.removeEventListener("mousedown", mouseDown);
    window.removeEventListener("mouseup", mouseUp);
    window.removeEventListener("mousemove", mouseMove);
    window.removeEventListener("wheel", wheel);
    window.removeEventListener("contextmenu", context, true);
    document.removeEventListener("pointerlockchange", lock);
    document.removeEventListener("visibilitychange", visibility);
    clearInput();
  };
}
