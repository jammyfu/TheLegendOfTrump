import { DefaultLoadingManager, type LoadingManager } from "three";

export type LoadingState = {
  active: boolean;
  loaded: number;
  total: number;
  sceneReady: boolean;
  interfaceReady: boolean;
  stage: "resources" | "scene" | "interface" | "ready" | "error";
  error: string | null;
};

/** GLTF dependencies arrive in waves; onLoad ends a wave, not scene startup.
 * Show actual completed work instead of a percentage of an unknown total. */
export function trackLoading(manager: LoadingManager) {
  let state: LoadingState = {
    active: true,
    loaded: 0,
    total: 0,
    sceneReady: false,
    interfaceReady: false,
    stage: "resources",
    error: null,
  };
  const listeners = new Set<() => void>();
  const failures = new Set<string>();
  const update = (next: Partial<LoadingState>) => {
    // A one-shot gate: optional loads during play must not reopen startup.
    if (!state.active) return;
    state = { ...state, ...next };
    state.stage = state.error
      ? "error"
      : state.loaded < state.total
        ? "resources"
        : !state.sceneReady
          ? "scene"
          : !state.interfaceReady
            ? "interface"
            : "ready";
    state.active = state.stage !== "ready";
    listeners.forEach((listener) => listener());
  };
  // onStart only fires for the first item of a batch. Observe every item,
  // including nested textures, without replacing other consumers' callbacks.
  const start = manager.itemStart.bind(manager);
  const end = manager.itemEnd.bind(manager);
  const error = manager.itemError.bind(manager);
  manager.itemStart = (url) => {
    update({ total: state.total + 1, sceneReady: false });
    start(url);
  };
  manager.itemEnd = (url) => {
    if (!failures.has(url)) update({ loaded: state.loaded + 1 });
    end(url);
  };
  manager.itemError = (url) => {
    failures.add(url);
    update({ error: url });
    error(url);
  };
  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    sceneReady: () => {
      if (state.loaded === state.total && !state.sceneReady)
        update({ sceneReady: true });
    },
    interfaceReady: () => update({ interfaceReady: true }),
    fail: (message: string) => update({ error: message }),
  };
}

const startup = trackLoading(DefaultLoadingManager);
export const getLoadingState = startup.getState;
export const subscribeLoading = startup.subscribe;
export const markSceneReady = startup.sceneReady;
export const markInterfaceReady = startup.interfaceReady;
export const failLoading = startup.fail;
