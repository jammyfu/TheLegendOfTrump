import type { Simulation } from "./game/simulation";
declare global {
  interface Window {
    __scene?: import("three").Scene;
    __camera?: import("three").Camera;
    __game?: Simulation;
  }
}
