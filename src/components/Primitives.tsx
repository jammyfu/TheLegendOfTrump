import type { ThreeElements } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import { Mesh } from "three";
import { ensureSurfaceUVs } from "../game/surfaceUV";
import { generatedColorMaps, texturedTint } from "../game/colorTextures";
import { generatedNormalMap, type Surface } from "../game/materials";
function surfaceFromColor(color: string): Surface {
  const hex = color.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16),
    g = parseInt(hex.slice(2, 4), 16),
    b = parseInt(hex.slice(4, 6), 16);
  if (g > r * 1.08 && g > b * 1.1) return "leaf";
  if (b > r * 1.1 && g > r) return "paint";
  if (r > g * 1.2 && g > b * 1.15 && r < 170) return "wood";
  if (r < 85 && g < 90 && b < 90) return "metal";
  return "stone";
}
function useSurfaceUV(surface: Surface, shape: string) {
  const ref = useRef<Mesh>(null);
  useLayoutEffect(() => {
    if (ref.current) ensureSurfaceUVs(ref.current, surface);
  }, [surface, shape]);
  return ref;
}
type Props = {
  position?: [number, number, number];
  scale?: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  surface?: Surface;
};
export function Box({
  position,
  scale = [1, 1, 1],
  rotation,
  color = "#e4dfce",
  surface = surfaceFromColor(color),
}: Props) {
  const ref = useSurfaceUV(surface, scale.join(","));
  return (
    <mesh ref={ref} position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={scale} />
      <meshStandardMaterial
        color={texturedTint(color, surface)}
        roughness={0.92}
        normalMap={generatedNormalMap(surface)}
        {...generatedColorMaps(surface)}
        normalScale={[0.12, 0.12]}
      />
    </mesh>
  );
}
export function Cylinder({
  position,
  radius = 0.5,
  top,
  rise = 1,
  color = "#ded8c4",
  surface = surfaceFromColor(color),
  segments = 12,
  ...props
}: Props & {
  radius?: number;
  top?: number;
  rise?: number;
  segments?: number;
} & Pick<ThreeElements["mesh"], "rotation">) {
  const ref = useSurfaceUV(surface, `${radius}:${top}:${rise}:${segments}`);
  return (
    <mesh ref={ref} position={position} {...props} castShadow receiveShadow>
      <cylinderGeometry args={[top ?? radius, radius, rise, segments]} />
      <meshStandardMaterial
        color={texturedTint(color, surface)}
        flatShading
        roughness={0.86}
        normalMap={generatedNormalMap(surface)}
        {...generatedColorMaps(surface)}
        normalScale={[0.12, 0.12]}
      />
    </mesh>
  );
}
export function Tree({
  x,
  z,
  size = 1,
}: {
  x: number;
  z: number;
  size?: number;
}) {
  return (
    <group position={[x, 0, z]} scale={size}>
      <Cylinder
        position={[0, 1.3, 0]}
        radius={0.25}
        rise={2.6}
        color="#6f5840"
        surface="bark"
        segments={6}
      />
      {[
        [0, 3, 0, 1.8],
        [-0.75, 3.8, 0.1, 1.45],
        [0.55, 4.1, 0, 1.6],
        [0, 5, 0, 1.2],
      ].map(([a, b, c, r], i) => (
        <mesh key={i} position={[a, b, c]} castShadow>
          <icosahedronGeometry args={[r, 0]} />
          <meshStandardMaterial
            color={["#506e3d", "#739346", "#88a354", "#668d45"][i]}
            flatShading
            normalMap={generatedNormalMap("leaf")}
            {...generatedColorMaps("leaf")}
            normalScale={[0.25, 0.25]}
          />
        </mesh>
      ))}
    </group>
  );
}
export function Flag({
  position = [0, 0, 0],
  scale = 1,
}: {
  position?: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <Cylinder
        position={[0, 2.8, 0]}
        radius={0.045}
        rise={5.6}
        color="#d7c89a"
      />
      <mesh position={[0, 5.63, 0]}>
        <sphereGeometry args={[0.1, 8, 6]} />
        <meshStandardMaterial
          color="#cfad5c"
          normalMap={generatedNormalMap("gold")}
          {...generatedColorMaps("gold")}
          normalScale={[0.16, 0.16]}
        />
      </mesh>
      <group position={[0.8, 4.7, 0]} rotation={[0, -0.2, -0.05]}>
        <Box scale={[1.6, 1, 0.04]} color="#f5ead2" surface="fabric" />
        {Array.from({ length: 7 }, (_, i) => (
          <Box
            key={i}
            position={[0, 0.43 - i * 0.142, 0.025]}
            scale={[1.6, 0.072, 0.025]}
            color="#a84139"
            surface="fabric"
          />
        ))}
        <Box
          position={[-0.42, 0.22, 0.05]}
          scale={[0.76, 0.57, 0.04]}
          color="#253d68"
          surface="fabric"
        />
        {Array.from({ length: 9 }, (_, i) => (
          <Box
            key={i}
            position={[
              -0.68 + (i % 3) * 0.23,
              0.04 + Math.floor(i / 3) * 0.17,
              0.078,
            ]}
            scale={[0.04, 0.04, 0.01]}
            color="#f5e7c0"
            surface="fabric"
          />
        ))}
      </group>
    </group>
  );
}
