export const SURFACES = ["grass","leaf","bark","stone","paving","road","roof","wood","walnut","soil","brick","terracotta","marble","hedge","sand","water","fabric","carpet","leather","paint","metal","gold","rubber","skin","hair","paper","glass","ceramic","rope","canvas","feather","flower"] as const;
export type Surface = typeof SURFACES[number];
/** Physical meters per repeat; independent of mesh length and authored UVs. */
export function surfaceMeters(surface: Surface) {
  return ({ grass: 4, leaf: 2, hedge: 2, bark: 1.8, stone: 3, paving: 2, road: 4, roof: 2, wood: 1.5, walnut: 1.5, soil: 2, marble: 3, carpet: 1.2, skin: 1, hair: 1 } as Partial<Record<Surface, number>>)[surface] ?? 1;
}
export function surfaceFor(name: string, objectName = ""): Surface {
  const m = name.toLowerCase(), n = objectName.toLowerCase();
  if (/soil|dirt/.test(n)) return "soil";
  if (/mown|lawn|grass/.test(n)) return "grass";
  if (/crosswalk|pavement|walkway/.test(n)) return "paving";
  if (/petal|flower/.test(n)) return "flower";
  if (/hedge/.test(n)) return "hedge";
  if (/boulder|rock/.test(n)) return "stone";
  if (/feather|fletch/.test(n)) return "feather";
  if (/rope|cord/.test(n)) return "rope";
  if (/paper|document|page/.test(n)) return "paper";
  if (/pottery|potbody|planterpot/.test(n)) return "terracotta";
  if (/gold|brass/.test(m)) return "gold";
  if (/silver|steel|iron|hilt|hammer|titanium/.test(m)) return "metal";
  if (/rubber|trump_black/.test(m)) return "rubber";
  if (/water/.test(m)) return "water";
  if (/cyan|glass/.test(m)) return "glass";
  if (/fuselage|presidential|navigation|adventure_(red|blue)/.test(m)) return "paint";
  if (/roof/.test(m)) return "roof";
  if (/road/.test(m)) return "road";
  if (/path/.test(m)) return "paving";
  if (/rug|carpet/.test(m)) return "carpet";
  if (/marble/.test(m)) return "marble";
  if (/stone|trim|concrete/.test(m)) return "stone";
  if (/leather/.test(m) || /grip/.test(n)) return "leather";
  if (/trunk/.test(m) || /trunk/.test(n)) return "bark";
  if (/walnut/.test(m)) return "walnut";
  if (/wood/.test(m)) return "wood";
  if (/tent|awning/.test(n)) return "canvas";
  if (/grass/.test(m)) return "grass";
  if (/leaf|herb|adventure_green/.test(m)) return "leaf";
  if (/hair|brow/.test(m)) return "hair";
  if (/skin|mouth/.test(m)) return "skin";
  if (/ivory/.test(m)) return /arrow|quiver/.test(n) ? "feather" : "stone";
  if (/lamp/.test(m)) return "glass";
  if (/shadow|dark/.test(m)) return "paint";
  if (/suit|lapel|tie|navy|ranger|crimson|red|white|blue/.test(m)) return "fabric";
  if (/adventure_pale/.test(m)) return "flower";
  return "paint";
}
