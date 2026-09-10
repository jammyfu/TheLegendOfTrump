import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Mesh, MeshBasicMaterial, Shape } from "three";
import { game } from "../game/simulation";

export function StunStars() {
  const root = useRef<Group>(null);
  const reduced = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)"), []);
  const star = useMemo(() => {
    const shape = new Shape();
    for (let i = 0; i < 10; i++) {
      const angle = i * Math.PI / 5 + Math.PI / 2, r = i % 2 ? .07 : .17;
      if (!i) shape.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      else shape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    shape.closePath();
    return shape;
  }, []);
  useFrame(({ camera }) => {
    if (!root.current) return;
    root.current.visible = game.stunTime > 0 && (game.phase === "playing" || game.phase === "paused");
    if (!root.current.visible) return;
    root.current.position.set(game.x, game.y + 3.5, game.z);
    const fade = Math.min(1, game.stunTime / .18);
    root.current.children.forEach((child, i) => {
      const angle = i * Math.PI * 2 / 5 + (reduced.matches ? 0 : game.elapsed * 5);
      child.position.set(Math.cos(angle) * .63, reduced.matches ? 0 : Math.sin(angle * 2) * .1, Math.sin(angle) * .63);
      child.quaternion.copy(camera.quaternion);
      child.rotateZ(reduced.matches ? 0 : Math.sin(angle) * .3);
      child.scale.setScalar(fade);
      ((child as Mesh).material as MeshBasicMaterial).opacity = fade;
    });
  });
  return <group ref={root} name="hero-stun-stars" visible={false}>
    {Array.from({ length: 5 }, (_, i) => <mesh key={i}>
      <shapeGeometry args={[star]} />
      <meshBasicMaterial color="#ffdc4c" transparent depthWrite={false} toneMapped={false} />
    </mesh>)}
  </group>;
}
