import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { game } from "../game/simulation";
import type { ShaderMaterial } from "three";

/** One screen-space pass. The central aiming/character area stays clear. */
export function SpeedLines() {
  const material = useRef<ShaderMaterial>(null);
  const reduced = useRef(false);
  const previous = useRef({ x: game.x, z: game.z, zone: game.zone, elapsed: game.elapsed });
  const uniforms = useMemo(
    () => ({
      intensity: { value: 0 },
      time: { value: 0 },
      aspect: { value: 1 },
    }),
    [],
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reduced.current = query.matches;
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useFrame(({ size }, delta) => {
    if (!material.current) return;
    // R3F may copy constructor properties; update the live GPU material.
    const uniforms = material.current.uniforms;
    const last = previous.current;
    const distance = Math.hypot(game.x - last.x, game.z - last.z);
    const simulatedDelta = game.elapsed - last.elapsed;
    const speed = distance / Math.max(simulatedDelta, 0.001);
    const moving =
      game.phase === "playing" &&
      game.moving &&
      game.grounded &&
      game.dodgeTime <= 0 &&
      game.attackTime <= 0 &&
      game.hitStop <= 0 &&
      game.zone === last.zone &&
      simulatedDelta > 0 && distance < 30 * simulatedDelta + .2;
    const target =
      !reduced.current && moving
        ? Math.min(1, Math.max(0, (speed - 3) / 5)) *
          (game.sprinting ? 0.7 : 0.16)
        : 0;
    uniforms.intensity.value = reduced.current
      ? 0
      : uniforms.intensity.value +
        (target - uniforms.intensity.value) *
          (1 - Math.exp(-Math.min(delta, 0.1) * 9));
    uniforms.time.value += Math.min(delta, 0.1) * (moving ? 1 : 0);
    uniforms.aspect.value = size.width / size.height;
    previous.current = { x: game.x, z: game.z, zone: game.zone, elapsed: game.elapsed };
  });
  return (
    <mesh name="running-speed-lines" frustumCulled={false} renderOrder={1000}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
        uniforms={uniforms}
        vertexShader={`varying vec2 screenUv; void main(){screenUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`}
        fragmentShader={`
        varying vec2 screenUv; uniform float intensity; uniform float time; uniform float aspect;
        void main(){
          vec2 p=(screenUv-.5)*2.0;
          float edge=smoothstep(.56,.98,max(abs(p.x),abs(p.y)));
          float angle=atan(p.y,p.x*aspect);
          float lane=angle*34.0;
          float stripe=pow(max(0.0,cos(lane)),28.0);
          float seed=fract(sin(floor(lane/6.28318)*127.1)*43758.5453);
          float pulse=pow(max(0.0,sin(length(p)*13.0-time*16.0+seed*30.0)),7.0);
          float alpha=stripe*pulse*edge*intensity*.48;
          gl_FragColor=vec4(.91,.94,.82,alpha);
        }`}
      />
    </mesh>
  );
}
