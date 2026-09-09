import { Color, TextureLoader, SRGBColorSpace, NoColorSpace, RepeatWrapping, LinearMipmapLinearFilter, type Texture } from "three";
import type { Surface } from "./materials";
const cache = new Map<string, Texture>();
export function texturedTint(color: string | Color, surface: Surface) {
  const tint = new Color(color);
  if (["grass", "leaf", "wood", "bark", "stone"].includes(surface)) tint.lerp(new Color("white"), 0.32);
  return tint;
}
function load(surface: Surface, kind: "color" | "roughness", x: number, y: number) {
  const key = `${surface}:${kind}:${x}:${y}`;
  let texture = cache.get(key);
  if (!texture) {
    texture = new TextureLoader().load(`${import.meta.env.BASE_URL}textures/gpt-materials/${surface}-${kind}.${kind === "color" ? "webp" : "png"}`);
    texture.name = `GPTImage_${surface}_${kind}`;
    texture.colorSpace = kind === "color" ? SRGBColorSpace : NoColorSpace;
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(x, y);
    texture.minFilter = LinearMipmapLinearFilter;
    texture.anisotropy = 4;
    cache.set(key, texture);
  }
  return texture;
}
/** Transparent optical surfaces retain their authored appearance. */
export function generatedColorMaps(surface: Surface, x = 1, y = x) {
  if (surface === "water" || surface === "glass") return {};
  return { map: load(surface, "color", x, y), roughnessMap: load(surface, "roughness", x, y) };
}
