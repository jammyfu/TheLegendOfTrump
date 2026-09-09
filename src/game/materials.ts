import {
  DataTexture,
  Mesh,
  MeshStandardMaterial,
  NoColorSpace,
  RGBAFormat,
  RepeatWrapping,
  UnsignedByteType,
  Vector2,
  type Material,
  type Object3D,
} from "three";

type Surface = "metal" | "glass" | "stone" | "wood" | "organic" | "fabric" | "skin";
const normalMaps = new Map<Surface, DataTexture>();

/** Small, shared tangent-space normal maps give the bitmap-free GLBs a stable
 * material grain without requesting external assets. They are intentionally
 * subtle so the stylised lighting remains clean at gameplay distance. */
function generatedNormalMap(surface: Surface) {
  const cached = normalMaps.get(surface);
  if (cached) return cached;
  const size = 32, pixels = new Uint8Array(size * size * 4);
  const strength: Record<Surface, number> = {
    metal: 9, glass: 2, stone: 22, wood: 17, organic: 13, fabric: 10, skin: 4,
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const grain = surface === "wood" ? Math.sin(y * 0.9 + Math.sin(x * .45) * 2) :
      Math.sin(x * 1.73 + y * 2.41) * Math.cos(x * .61 - y * 1.19);
    const dx = grain - (surface === "wood" ? Math.sin(y * .9 + Math.sin((x - 1) * .45) * 2) : Math.sin((x - 1) * 1.73 + y * 2.41) * Math.cos((x - 1) * .61 - y * 1.19));
    const dy = grain - (surface === "wood" ? Math.sin((y - 1) * .9 + Math.sin(x * .45) * 2) : Math.sin(x * 1.73 + (y - 1) * 2.41) * Math.cos(x * .61 - (y - 1) * 1.19));
    pixels[i] = 128 + dx * strength[surface]; pixels[i + 1] = 128 + dy * strength[surface];
    pixels[i + 2] = 255; pixels[i + 3] = 255;
  }
  const texture = new DataTexture(pixels, size, size, RGBAFormat, UnsignedByteType);
  texture.name = `Legend_${surface}_normal`; texture.colorSpace = NoColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping; texture.needsUpdate = true;
  normalMaps.set(surface, texture); return texture;
}

function surfaceFor(name: string): Surface {
  if (/(gold|brass|silver|steel|iron|hilt|weapon|hammer)/.test(name)) return "metal";
  if (/(cyan|glass|water)/.test(name)) return "glass";
  if (/(stone|ivory|white|path|concrete|roof)/.test(name)) return "stone";
  if (/(wood|walnut|leather|trunk)/.test(name)) return "wood";
  if (/(leaf|grass|herb)/.test(name)) return "organic";
  if (/(skin|hair)/.test(name)) return "skin";
  return "fabric";
}

/**
 * The shipped GLBs deliberately contain no bitmap maps. This pass gives every
 * named material a consistent PBR response without requiring a UV unwrap or
 * mutating the source assets.
 */
export function legendMaterial(source: Material) {
  const material = source instanceof MeshStandardMaterial ? source : null;
  if (!material) return source.clone();
  const styled = material.clone();
  const name = styled.name.toLowerCase();
  const surface = surfaceFor(name);
  styled.normalMap = generatedNormalMap(surface);
  styled.normalScale = new Vector2(surface === "glass" || surface === "skin" ? .16 : .34, surface === "glass" || surface === "skin" ? .16 : .34);
  styled.envMapIntensity = 0.7;
  styled.roughness = 0.62;
  styled.metalness = 0;
  styled.emissiveIntensity = 0;

  if (surface === "metal") {
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
  if (surface === "stone") {
    styled.metalness = 0;
    styled.roughness = 0.82;
  }
  if (surface === "wood") {
    styled.metalness = 0;
    styled.roughness = 0.66;
  }
  if (surface === "organic") {
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
    node.material = Array.isArray(node.material)
      ? node.material.map(legendMaterial)
      : legendMaterial(node.material);
  });
  return root;
}
