import { Color, ShaderChunk, TextureLoader, SRGBColorSpace, NoColorSpace, RepeatWrapping, LinearMipmapLinearFilter, type Texture, type MeshStandardMaterial } from "three";
import type { Surface } from "./surfaceCatalog";
const cache = new Map<string, Texture>();
export function texturedTint(color: string | Color, surface: Surface) {
  const tint = new Color(color);
  if (surface === "grass") return new Color("#c3cbb7");
  if (["leaf", "hedge", "wood", "walnut", "bark", "stone", "soil", "paving", "road", "roof", "marble", "terracotta", "brick", "sand"].includes(surface)) tint.lerp(new Color("white"), 0.55);
  else if (["fabric", "canvas", "carpet"].includes(surface)) tint.lerp(new Color("white"), 0.035);
  return tint;
}
export const balancedSurfaceShader: MeshStandardMaterial["onBeforeCompile"] = (shader) => {
  shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", ShaderChunk.map_fragment.replace(
    "diffuseColor *= sampledDiffuseColor;",
    `float surfaceLuma = dot(sampledDiffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
     sampledDiffuseColor.rgb = mix(vec3(surfaceLuma), sampledDiffuseColor.rgb, 0.65);
     diffuseColor *= sampledDiffuseColor;`,
  ));
};
const surfaceShaderKey = () => "balanced-gpt-surface-v1";
function load(surface: Surface, kind: "color" | "roughness", x: number, y: number) {
  const key = `${surface}:${kind}:${x}:${y}`;
  let texture = cache.get(key);
  if (!texture) {
    texture = new TextureLoader().load(`${import.meta.env.BASE_URL}textures/runtime/${surface}-${kind}.webp`);
    texture.name = `GPTImage_${surface}_${kind}`;
    texture.colorSpace = kind === "color" ? SRGBColorSpace : NoColorSpace;
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(x, y);
    texture.minFilter = LinearMipmapLinearFilter;
    texture.anisotropy = 8;
    cache.set(key, texture);
  }
  return texture;
}
/** Transparent optical surfaces retain their authored appearance. */
export function generatedColorMaps(surface: Surface, x = 1, y = x) {
  if (surface === "water" || surface === "glass") return {};
  return { map: load(surface, "color", x, y), roughnessMap: load(surface, "roughness", x, y), onBeforeCompile: balancedSurfaceShader, customProgramCacheKey: surfaceShaderKey };
}
