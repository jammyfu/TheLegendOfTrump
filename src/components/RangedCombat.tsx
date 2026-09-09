import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import { game } from "../game/simulation";
const projected = new Vector3(),
  forward = new Vector3(),
  up = new Vector3(0, 1, 0);
export function RangedCombat() {
  const arrows = useRef<Group>(null),
    portals = useRef<Group>(null),
    supplies = useRef<Group>(null);
  useFrame(({ camera, size }) => {
    const reticle = document.getElementById("lock-reticle");
    const enemy = game.lockTarget;
    if (reticle) {
      reticle.hidden = !enemy || game.phase !== "playing";
      if (enemy) {
        projected
          .set(enemy.x, enemy.id === 100 ? 2.6 : 1.6, enemy.z)
          .project(camera);
        reticle.hidden =
          projected.z > 1 ||
          projected.z < -1 ||
          Math.abs(projected.x) > 1 ||
          Math.abs(projected.y) > 1;
        reticle.style.transform = `translate(${(projected.x * 0.5 + 0.5) * size.width}px,${(-projected.y * 0.5 + 0.5) * size.height}px) translate(-50%,-50%)`;
        reticle.style.opacity = game.visible(
          enemy.x,
          enemy.z,
          "guard-" + enemy.id,
        )
          ? "1"
          : ".35";
      }
    }
    arrows.current?.children.forEach((o, i) => {
      const a = game.projectiles[i];
      o.visible = !!a;
      if (a) {
        o.position.set(a.x, a.y, a.z);
        forward.set(a.vx, a.vy, a.vz).normalize();
        o.quaternion.setFromUnitVectors(up, forward);
      }
    });
    portals.current?.children.forEach((o, i) => {
      o.visible = game.zone === "office" && game.summonTime > 0;
      o.position.set(i ? 7 : -7, 0.12, -5);
      o.rotation.y = game.elapsed * 2;
      o.scale.setScalar(1 + Math.sin(game.elapsed * 9) * 0.05);
    });
    supplies.current?.children.forEach((o, i) => {
      const a = game.supplies[i];
      o.visible = !!a && !a.collected;
      if (a) {
        o.position.set(a.x, 0.6 + Math.sin(game.elapsed * 3) * 0.1, a.z);
        o.rotation.y = game.elapsed;
      }
    });
  });
  return (
    <>
      <group ref={arrows}>
        {Array.from({ length: 8 }, (_, i) => (
          <group key={i} visible={false} name={`arrow-${i}`}>
            <mesh>
              <cylinderGeometry args={[0.025, 0.025, 0.85, 5]} />
              <meshStandardMaterial color="#c5a377" />
            </mesh>
            <mesh position={[0, 0.5, 0]}>
              <coneGeometry args={[0.07, 0.22, 4]} />
              <meshStandardMaterial
                color="#d5f9f7"
                metalness={0.5}
                roughness={0.25}
              />
            </mesh>
            <mesh position={[0, -0.48, 0]}>
              <boxGeometry args={[0.16, 0.22, 0.02]} />
              <meshBasicMaterial color="#72e3e9" />
            </mesh>
            <mesh position={[0, -0.7, 0]}>
              <cylinderGeometry args={[0.017, 0.002, 0.6, 4]} />
              <meshBasicMaterial color="#a2faff" transparent opacity={0.55} />
            </mesh>
          </group>
        ))}
      </group>
      <group ref={portals}>
        {[-1, 1].map((i) => (
          <group key={i} visible={false}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1, 1.2, 48]} />
              <meshBasicMaterial
                color="#73e7ff"
                transparent
                opacity={0.85}
                depthWrite={false}
              />
            </mesh>
            <mesh position={[0, 1, 0]}>
              <cylinderGeometry args={[1.1, 1.1, 2, 24, 1, true]} />
              <meshBasicMaterial
                color="#51c9ff"
                transparent
                opacity={0.16}
                depthWrite={false}
              />
            </mesh>
            {[0, 1, 2, 3].map((j) => (
              <mesh
                key={j}
                position={[
                  Math.sin((j * Math.PI) / 2),
                  0.3,
                  Math.cos((j * Math.PI) / 2),
                ]}
              >
                <octahedronGeometry args={[0.15]} />
                <meshBasicMaterial color="#d0fdff" />
              </mesh>
            ))}
          </group>
        ))}
      </group>
      <group ref={supplies}>
        {Array.from({ length: 8 }, (_, i) => (
          <group key={i} visible={false}>
            <mesh>
              <octahedronGeometry args={[0.28]} />
              <meshStandardMaterial color="#63d8da" emissive="#126d70" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
              <ringGeometry args={[0.35, 0.42, 20]} />
              <meshBasicMaterial color="#abf6ed" />
            </mesh>
          </group>
        ))}
      </group>
    </>
  );
}
