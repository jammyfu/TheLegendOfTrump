import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Group } from "three";
import { batchStatic } from "../game/staticBatch";
/** Children must have no per-frame transforms, visibility changes or material animation. */
export function StaticBatch({ children }: { children: ReactNode }) {
  const root = useRef<Group>(null);
  useLayoutEffect(
    () => (root.current ? batchStatic(root.current) : undefined),
    [],
  );
  return <group ref={root}>{children}</group>;
}
