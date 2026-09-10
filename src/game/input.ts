import { game } from "./simulation";
import { unlockAudio } from "./audio";
import { dragAimEdge } from "./dragAim";
export const keys = new Set<string>();
export const joystick = { x: 0, z: 0 };
const mouse = { guard: false };
let guardPointer: number | null = null;
let bowButton: number | null = null;
let bowCapture: { canvas: HTMLCanvasElement; id: number } | null = null;
let bowGesture: {
  canvas: HTMLCanvasElement; x: number; y: number;
  fallback: boolean; panX: number; panY: number;
} | null = null;
let dragHintShown = false;
function enableDragAim(gesture: NonNullable<typeof bowGesture>) {
  if (bowGesture !== gesture || bowButton === null || !game.attackHeld || game.phase !== "playing") return;
  gesture.fallback = true;
  gesture.canvas.dataset.aimInput = "drag";
  if (!dragHintShown) {
    dragHintShown = true;
    game.notify("按住拖动瞄准 · 贴近画面边缘持续转向 · 右键精瞄 · 松手射箭");
  }
}
/** Called every rendered frame, so aiming can continue at a stationary edge. */
export function updateMouseAim(dt: number) {
  const gesture = bowGesture;
  if (!gesture?.fallback) return;
  if (game.phase !== "playing" || game.weapon !== "bow" || !game.attackHeld) {
    clearInput();
    return;
  }
  const rect = gesture.canvas.getBoundingClientRect();
  const x = dragAimEdge(gesture.x - rect.left, rect.width);
  const y = dragAimEdge(gesture.y - rect.top, rect.height);
  const delta = Math.max(0, Math.min(dt, 0.05));
  const blend = 1 - Math.exp(-delta * 14);
  // Returning to the safe central region stops immediately; entering an edge
  // eases in, without a sudden jump at the boundary.
  gesture.panX = x === 0 ? 0 : gesture.panX + (x - gesture.panX) * blend;
  gesture.panY = y === 0 ? 0 : gesture.panY + (y - gesture.panY) * blend;
  const speed = 360 * delta * (game.aiming ? 0.35 : 1);
  game.look(gesture.panX * speed, gesture.panY * speed, true);
  const crosshair = document.getElementById("bow-crosshair");
  if (crosshair) {
    crosshair.dataset.pan = Math.abs(x) + Math.abs(y) > 0 ? "true" : "false";
    crosshair.style.setProperty("--pan-angle", `${Math.atan2(y, x)}rad`);
  }
}
function releaseBowCapture() {
  if (bowGesture) delete bowGesture.canvas.dataset.aimInput;
  bowGesture = null;
  const crosshair = document.getElementById("bow-crosshair");
  if (crosshair) delete crosshair.dataset.pan;
  const capture = bowCapture;
  bowCapture = null;
  if (capture?.canvas.hasPointerCapture(capture.id))
    capture.canvas.releasePointerCapture(capture.id);
}
let middleDrag = false,
  intentionalRelease = false;
export const held = { sprint: false, guard: false };
export function clearInput() {
  game.cancelCharge();
  bowButton = null;
  releaseBowCapture();
  game.aiming = false;
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
  releaseBowCapture();
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
    if (game.phase === "playing" && game.weapon === "bow" &&
        e.pointerType === "mouse" && (e.button === 0 || e.button === 2) &&
        e.target instanceof HTMLCanvasElement) {
      // WebViews without Pointer Lock can still deliver drag/release events
      // outside the canvas. This is capture, not system cursor confinement.
      if (!bowCapture && bowButton === null) {
        bowCapture = { canvas: e.target, id: e.pointerId };
        e.target.setPointerCapture(e.pointerId);
      }
      return;
    }
    if (e.button !== 2 || game.phase !== "playing" ||
        !(e.target instanceof HTMLCanvasElement)) return;
    // Bow owns both buttons through mouse events, including pointer-lock input.
    // Cancelling pointerdown here would suppress the matching mousedown.
    if (game.weapon === "bow") return;
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
    if (bowButton !== null && (e.type === "pointercancel" ||
        e.type === "lostpointercapture" && bowGesture?.fallback && bowCapture?.id === e.pointerId)) {
      clearInput();
      releaseMouse();
    }
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
        ["reading", "dialogue", "obtaining"].includes(game.phase) &&
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
      if (game.mouseLookSuspended && game.weapon !== "bow") releaseMouse();
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
    if (game.phase === "playing" || game.phase === "obtaining") game.pause();
    releaseMouse();
  };
  const mouseDown = (e: MouseEvent) => {
    if (game.phase !== "playing" || !(e.target instanceof HTMLCanvasElement))
      return;
    unlockAudio();
    if (game.weapon === "bow" && (e.button === 0 || e.button === 2)) {
      e.preventDefault();
      if (bowButton !== null) return;
      bowButton = e.button;
      mouse.guard = e.button === 2;
      game.aiming = e.button === 2;
      game.pressAttack();
      if (game.attackHeld) {
        const canvas = e.target;
        const gesture = bowGesture = { canvas, x: e.clientX, y: e.clientY,
          fallback: false, panX: 0, panY: 0 };
        const unavailable = () => enableDragAim(gesture);
        if (typeof canvas.requestPointerLock !== "function") {
          unavailable();
          return;
        }
        try {
          const pending = canvas.requestPointerLock();
          pending?.then(() => {
            if (bowGesture !== gesture || bowButton === null || game.phase !== "playing" || !game.attackHeld) releaseMouse();
          }).catch(unavailable);
        } catch { unavailable(); }
      } else {
        bowButton = null;
        releaseBowCapture();
      }
      return;
    }
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
    if (bowButton !== null && e.button === bowButton) {
      bowButton = null;
      game.releaseAttack();
      mouse.guard = false;
      game.aiming = false;
      guardPointer = null;
      releaseMouse();
      return;
    }
    if (e.button === 1) middleDrag = false;
    if (e.button === 0 && bowButton === null) game.releaseAttack();
    // Pointerup fires only when the last button is released. Releasing right
    // while left remains held still needs to end guard via mouseup.
    if (e.button === 2 && (e.buttons & 2) === 0) {
      guardPointer = null;
      mouse.guard = false;
    }
  };
  const mouseMove = (e: MouseEvent) => {
    if (bowGesture && !document.pointerLockElement) {
      const dx = e.clientX - bowGesture.x, dy = e.clientY - bowGesture.y;
      bowGesture.x = e.clientX;
      bowGesture.y = e.clientY;
      if (bowGesture.fallback && game.phase === "playing" && game.weapon === "bow") {
        // WebViews can report zero movementX/Y; captured absolute deltas work
        // across canvas boundaries, without moving the browser's real cursor.
        game.look(dx, dy, false, false);
        return;
      }
    }
    if (game.phase === "playing" && game.weapon === "bow" && (document.pointerLockElement || e.target instanceof HTMLCanvasElement)) {
      game.look(e.movementX, e.movementY, middleDrag && (e.buttons & 4) !== 0);
      return;
    }
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
    const inGame = e.target instanceof Element && !!e.target.closest(".game");
    if (
      document.pointerLockElement ||
      inGame ||
      e.target instanceof HTMLCanvasElement ||
      held.guard || mouse.guard
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  // iOS/WeChat can still pan the document despite canvas touch-action rules
  // when a gesture starts over a HUD layer. Gameplay owns those gestures.
  const touchMove = (e: TouchEvent) => {
    if (
      game.phase === "playing" &&
      e.target instanceof Element &&
      e.target.closest(".game") &&
      !e.target.closest(".hud-detail-panel")
    )
      e.preventDefault();
  };
  const lock = () => {
    if (document.pointerLockElement) {
      if (bowButton === null || game.weapon !== "bow" || !game.attackHeld) releaseMouse();
      else if (bowGesture) {
        bowGesture.fallback = false;
        delete bowGesture.canvas.dataset.aimInput;
      }
      return;
    }
    if (!document.pointerLockElement) {
      middleDrag = false;
      if (!intentionalRelease) {
        clearInput();
        if (game.phase === "playing") game.pause();
      }
      intentionalRelease = false;
    }
  };
  const visibility = () => {
    if (document.hidden) blur();
  };
  const lockError = () => {
    if (bowGesture) enableDragAim(bowGesture);
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
  window.addEventListener("touchmove", touchMove, { passive: false });
  document.addEventListener("pointerlockchange", lock);
  document.addEventListener("pointerlockerror", lockError);
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
    window.removeEventListener("touchmove", touchMove);
    document.removeEventListener("pointerlockchange", lock);
    document.removeEventListener("pointerlockerror", lockError);
    document.removeEventListener("visibilitychange", visibility);
    clearInput();
  };
}
