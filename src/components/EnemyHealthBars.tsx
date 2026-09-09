import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Mesh } from "three";
import { ENEMY_RULES, enemyScale } from "../game/expedition";
import { game } from "../game/simulation";

function EnemyHealthBar({ id, boss = false }: { id: number; boss?: boolean }) {
  const group = useRef<Group>(null);
  const fill = useRef<Mesh>(null);
  useFrame(({ camera }) => {
    if (!group.current || !fill.current) return;
    const guard = game.activeGuards.find((enemy) => enemy.id === id);
    const enemy = boss ? game.boss : guard;
    group.current.visible = Boolean(
      enemy && enemy.hp > 0 &&
      (game.phase === "playing" || game.phase === "paused") &&
      (!boss || (game.zone === "office" && game.boss.active)) &&
      Math.hypot(enemy.x - game.x, enemy.z - game.z) <= 75,
    );
    if (!group.current.visible || !enemy) return;
    const size = guard ? enemyScale(guard) : 1.5;
    // Summoned guards spawn with two hearts; captains scale their base health.
    const maxHp = boss ? game.boss.maxHp : game.zone === "office" ? 2 :
      Math.round(ENEMY_RULES[guard!.kind].hp * (guard!.sizeMultiplier ?? 1));
    const ratio = Math.max(0, Math.min(1, enemy.hp / maxHp));
    group.current.position.set(enemy.x, 3.35 * size, enemy.z);
    group.current.quaternion.copy(camera.quaternion);
    group.current.scale.setScalar(Math.min(size, 1.8));
    fill.current.scale.x = ratio;
    fill.current.position.x = -(1 - ratio) * 0.7;
    group.current.userData.hp = enemy.hp;
    group.current.userData.maxHp = maxHp;
  });
  return (
    <group ref={group} name={`enemy-health-${id}`} visible={false}>
      <mesh>
        <planeGeometry args={[1.5, 0.21]} />
        <meshBasicMaterial color={boss ? "#edc269" : "#e5d8b8"} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.006]}>
        <planeGeometry args={[1.42, 0.135]} />
        <meshBasicMaterial color="#261e25" toneMapped={false} />
      </mesh>
      <mesh ref={fill} position={[0, 0, 0.012]} name={`enemy-health-fill-${id}`}>
        <planeGeometry args={[1.4, 0.115]} />
        <meshBasicMaterial color="#ef5656" toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Frame-driven world-space bars: no DOM layout or React updates during combat. */
export function EnemyHealthBars() {
  return <>
    {game.guards.map((enemy) => <EnemyHealthBar key={enemy.id} id={enemy.id} />)}
    <EnemyHealthBar id={100} boss />
    <EnemyHealthBar id={101} />
    <EnemyHealthBar id={102} />
  </>;
}
