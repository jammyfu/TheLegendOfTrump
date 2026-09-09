import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Box3, Mesh, Vector3 } from "three";
import { game } from "../game/simulation";
import { meshBlocksView, canFadeForCamera, OcclusionFade } from "../game/occlusion";

export function CameraOcclusion() {
  const state = useMemo(
    () => ({
      fades: new Map<Mesh, OcclusionFade>(),
      blocked: new Set<Mesh>(),
      elapsed: 1,
      bounds: new Box3(),
      subject: new Vector3(),
    }),
    [],
  );
  useEffect(
    () => () => {
      state.fades.forEach((f) => f.dispose());
      state.fades.clear();
    },
    [state],
  );
  // After camera and actor transforms, without taking over the render loop.
  useFrame(({ scene, camera }, delta) => {
    const dt = Math.min(delta, 0.1);
    state.elapsed += dt;
    const root = scene.getObjectByName("camera-occluders");
    if (state.elapsed >= 0.075 || !root || game.phase === "title") {
      state.elapsed = 0;
      state.blocked.clear();
      if (root && game.phase !== "title" && game.phase !== "intro") {
        root.updateWorldMatrix(true, true);
        root.traverseVisible((node) => {
          if (!(node instanceof Mesh)) return;
          if (!canFadeForCamera(node)) return;
          const materials = Array.isArray(node.material)
            ? node.material
            : [node.material];
          if (!materials.some((m) => "normalMap" in m)) return; // No unlit effects.
          if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
          if (!node.geometry.boundingBox) return;
          state.bounds
            .copy(node.geometry.boundingBox)
            .applyMatrix4(node.matrixWorld);
          let blockedRays = 0;
          for (const [side, height] of [
            [0, 1.3],
            [-0.4, 1.5],
            [0.4, 1.5],
            [0, 2.2],
          ]) {
            state.subject.set(
              game.x + side * camera.matrixWorld.elements[0],
              game.y + height,
              game.z + side * camera.matrixWorld.elements[2],
            );
            if (meshBlocksView(node, state.bounds, camera.position, state.subject)) {
              blockedRays++;
              if (blockedRays >= 2) {
                state.blocked.add(node);
                break;
              }
            }
          }
        });
      }
      state.blocked.forEach((mesh) => {
        if (!state.fades.has(mesh))
          state.fades.set(mesh, new OcclusionFade(mesh));
      });
    }
    state.fades.forEach((fade, mesh) => {
      if (fade.update(state.blocked.has(mesh), dt)) {
        fade.dispose();
        state.fades.delete(mesh);
      }
    });
  });
  return null;
}
