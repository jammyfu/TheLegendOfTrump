import type { Simulation } from "./game/simulation";
declare global {
  interface Window {
    __game?: Simulation;
  }
}
