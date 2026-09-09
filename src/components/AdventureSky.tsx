import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BackSide, Group } from "three";
export function AdventureSky() {
  const clouds = useRef<Group>(null);
  useFrame((_, dt) => {
    if (clouds.current) clouds.current.rotation.y += dt * 0.002;
  });
  return (
    <>
      <mesh renderOrder={-100}>
        <sphereGeometry args={[2100, 32, 20]} />
        <shaderMaterial
          side={BackSide}
          depthWrite={false}
          toneMapped={false}
          vertexShader={`varying vec3 direction; void main(){direction=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`}
          fragmentShader={`varying vec3 direction;
          float hash(float n){return fract(sin(n*127.1)*43758.5453);} void main(){vec3 d=normalize(direction);float h=pow(max(d.y,0.0),.55);vec3 c=mix(vec3(.76,.87,.91),vec3(.20,.49,.82),h);float sun=pow(max(dot(d,normalize(vec3(-.45,.60,-.65))),0.0),700.0);c+=vec3(1.0,.83,.52)*sun;
          // Very distant, haze-softened low-rise skyline behind the modeled district.
          float az=atan(d.z,d.x)/6.2831853+.5;
          float cell=floor(az*180.0);float local=fract(az*180.0);
          float roof=.012+.026*hash(cell);
          roof+=step(.34,local)*step(local,.66)*.008*step(.72,hash(cell+31.0));
          float silhouette=(1.0-smoothstep(roof,roof+.0015,d.y))*step(0.0,d.y)*step(local,.92);
          c=mix(c,vec3(.56,.67,.70),silhouette*.62);gl_FragColor=vec4(c,1.0);}`}
        />
      </mesh>
      <mesh position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2300, 2400]} />
        <meshStandardMaterial color="#8eaa6a" />
      </mesh>
      <group ref={clouds}>
        {Array.from({ length: 14 }, (_, i) => {
          const a = i * 2.399;
          return (
            <group
              key={i}
              position={[
                Math.cos(a) * 350,
                100 + (i % 4) * 20,
                Math.sin(a) * 350,
              ]}
              rotation={[0, a, 0]}
            >
              {[0, 1, 2, 3].map((j) => (
                <mesh
                  key={j}
                  position={[j * 12 - 16, Math.sin(j * 2) * 1.1, 0]}
                  scale={[18, 3.5 + (j % 2), 9]}
                >
                  <sphereGeometry args={[1, 12, 8]} />
                  <meshBasicMaterial
                    color="#fff9e7"
                    transparent
                    opacity={0.85}
                    fog={false}
                  />
                </mesh>
              ))}
            </group>
          );
        })}
      </group>
    </>
  );
}
