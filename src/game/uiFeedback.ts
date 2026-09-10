import { playUiSound, type UiSound } from "./audio";

function control(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const element = target.closest<HTMLElement>(
    'button, summary, input[type="checkbox"]',
  );
  if (!element || element.matches(':disabled, [aria-disabled="true"]'))
    return null;
  return element;
}

function soundFor(element: HTMLElement): UiSound {
  if (element.closest(".adventure-buttons")) return "press";
  if (element.matches(".primary, .lt-start")) return "confirm";
  if (element.matches(".close-button, .text-button")) return "back";
  if (element.matches('[aria-pressed], summary, input[type="checkbox"]'))
    return "toggle";
  return "select";
}

/** Held combat controls respond on press; their later synthetic click is silent. */
export function uiPointerFeedback(target: EventTarget | null, button: number) {
  if (button !== 0) return;
  const element = control(target);
  if (element?.closest(".adventure-buttons")) playUiSound("press");
}

/** React bubbling runs after the button's action, including unmuting audio. */
export function uiClickFeedback(target: EventTarget | null, detail: number) {
  const element = control(target);
  if (!element || (detail > 0 && element.closest(".adventure-buttons"))) return;
  const sound = soundFor(element);
  // Checkbox onChange is dispatched after React's click bubbling.
  if (element.matches('input[type="checkbox"]'))
    queueMicrotask(() => playUiSound(sound));
  else playUiSound(sound);
}
