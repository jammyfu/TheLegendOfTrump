import {
  TextureLoader,
  Texture,
  BufferGeometry,
  Float32BufferAttribute,
  LinearMipmapLinearFilter,
  Mesh,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  Vector2,
  type Material,
  type Object3D,
} from "three";
import { generatedColorMaps, texturedTint } from "./colorTextures";

export type Surface =
  | "metal"
  | "gold"
  | "paint"
  | "glass"
  | "water"
  | "stone"
  | "paving"
  | "roof"
  | "wood"
  | "bark"
  | "leather"
  | "fabric"
  | "grass"
  | "leaf"
  | "skin"
  | "hair"
  | "rubber";
const normalMaps = new Map<string, Texture>();
const strength: Record<Surface, number> = {
  metal: 0.22,
  gold: 0.16,
  paint: 0.24,
  glass: 0.08,
  water: 0.4,
  stone: 0.55,
  paving: 0.5,
  roof: 0.45,
  wood: 0.4,
  bark: 0.6,
  leather: 0.4,
  fabric: 0.35,
  grass: 0.55,
  leaf: 0.3,
  skin: 0.15,
  hair: 0.25,
  rubber: 0.3,
};

/** Shared linear data maps, with mipmaps to prevent distant surface shimmer. */
export function generatedNormalMap(
  surface: Surface,
  repeatX = 1,
  repeatY = repeatX,
) {
  const key = `${surface}:${repeatX}:${repeatY}`;
  const cached = normalMaps.get(key);
  if (cached) return cached;
  const texture = new TextureLoader().load(
    import.meta.env.BASE_URL + `textures/normals/${surface}-normal.png`,
  );
  texture.name = `Legend_${surface}_normal`;
  texture.colorSpace = NoColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.minFilter = LinearMipmapLinearFilter;
  normalMaps.set(key, texture);
  return texture;
}

export function surfaceFor(name: string): Surface {
  name = name.toLowerCase();
  if (/(gold|brass)/.test(name)) return "gold";
  if (/(silver|steel|iron|hilt|weapon|hammer|titanium)/.test(name))
    return "metal";
  if (/rubber/.test(name)) return "rubber";
  if (/(fuselage|presidential|navigation)/.test(name)) return "paint";
  if (/water/.test(name)) return "water";
  if (/(cyan|glass)/.test(name)) return "glass";
  if (/roof/.test(name)) return "roof";
  if (/(path|road)/.test(name)) return "paving";
  if (/(stone|ivory|trim|concrete)/.test(name)) return "stone";
  if (/leather/.test(name)) return "leather";
  if (/trunk/.test(name)) return "bark";
  if (/(wood|walnut)/.test(name)) return "wood";
  if (/grass/.test(name)) return "grass";
  if (/(leaf|herb|adventure_green)/.test(name)) return "leaf";
  if (/(hair|brow)/.test(name)) return "hair";
  if (/(skin|mouth)/.test(name)) return "skin";
  return "fabric";
}

/**
 * Add GPT Image color textures and derived roughness to untextured GLBs.
 * Preserve authored maps and supply projected UVs without mutating source assets.
 */
export function legendMaterial(source: Material) {
  const material = source instanceof MeshStandardMaterial ? source : null;
  if (!material) return source.clone();
  const styled = material.clone();
  const name = styled.name.toLowerCase();
  const surface = surfaceFor(name);
  const textures = generatedColorMaps(surface);
  if (!styled.map && textures.map) {
    styled.map = textures.map;
    styled.color.copy(texturedTint(styled.color, surface));
  }
  if (!styled.roughnessMap && textures.roughnessMap) styled.roughnessMap = textures.roughnessMap;
  if (!styled.normalMap) {
    styled.normalMap = generatedNormalMap(surface);
    styled.normalScale = new Vector2(strength[surface], strength[surface]);
  }
  styled.envMapIntensity = 0.7;
  styled.roughness = 0.62;
  styled.metalness = 0;
  styled.emissiveIntensity = 0;

  if (surface === "metal" || surface === "gold") {
    styled.metalness = 0.78;
    styled.roughness = /(iron|hammer)/.test(name) ? 0.42 : 0.28;
    styled.envMapIntensity = 1.15;
  }
  if (/(navy|suit|dark|roof)/.test(name)) {
    styled.metalness = 0.28;
    styled.roughness = 0.43;
  }
  if (surface === "glass") {
    styled.metalness = 0.35;
    styled.roughness = 0.18;
    styled.emissive.copy(styled.color).multiplyScalar(0.18);
    styled.emissiveIntensity = 0.62;
  }
  if (["stone", "paving", "roof"].includes(surface)) {
    styled.metalness = 0;
    styled.roughness = 0.82;
  }
  if (["wood", "bark", "leather"].includes(surface)) {
    styled.metalness = 0;
    styled.roughness = 0.66;
  }
  if (surface === "grass" || surface === "leaf") {
    styled.metalness = 0;
    styled.roughness = 0.9;
  }
  if (/(red|crimson|tie|banner)/.test(name)) {
    styled.metalness = 0.08;
    styled.roughness = 0.48;
  }
  if (surface === "skin") {
    styled.metalness = 0;
    styled.roughness = 0.72;
  }
  return styled;
}

export function applyLegendMaterials(root: Object3D) {
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    ensureNormalUVs(node);
    node.material = Array.isArray(node.material)
      ? node.material.map(legendMaterial)
      : legendMaterial(node.material);
  });
  return root;
}

const projected = new WeakMap<BufferGeometry, BufferGeometry>();
/** Face projection in local model coordinates keeps rigid animated parts stable.
 * Preserve authored UVs; split indexed triangles only when UVs are absent. */
export function ensureNormalUVs(mesh: Mesh) {
  const source = mesh.geometry;
  if (source.getAttribute("uv")) return;
  let geometry = projected.get(source);
  if (!geometry) {
    geometry = source.index ? source.toNonIndexed() : source.clone();
    const p = geometry.getAttribute("position");
    const uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i += 3) {
      const ax = p.getX(i + 1) - p.getX(i),
        ay = p.getY(i + 1) - p.getY(i),
        az = p.getZ(i + 1) - p.getZ(i);
      const bx = p.getX(i + 2) - p.getX(i),
        by = p.getY(i + 2) - p.getY(i),
        bz = p.getZ(i + 2) - p.getZ(i);
      const nx = Math.abs(ay * bz - az * by),
        ny = Math.abs(az * bx - ax * bz),
        nz = Math.abs(ax * by - ay * bx);
      const axis = nx >= ny && nx >= nz ? 0 : ny >= nz ? 1 : 2;
      for (let j = i; j < i + 3; j++) {
        uv[j * 2] = axis === 0 ? p.getZ(j) : p.getX(j);
        uv[j * 2 + 1] = axis === 1 ? p.getZ(j) : p.getY(j);
      }
    }
    geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    projected.set(source, geometry);
  }
  mesh.geometry = geometry;
}
