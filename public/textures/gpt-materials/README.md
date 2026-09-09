# GPT Image game materials

`source-atlas.png` is the original GPT Image output: a 4×4 atlas of hand-painted adventure-game base-color surfaces. Generated for this project on 2026-09-10.

`scripts/prepare-gpt-materials.mjs <atlas-path>` extracts the 16 cells into 256×256 WebP color textures and derives linear grayscale roughness variation. Roughness maps are artistic approximations, not measured PBR scans. Existing procedural tangent-space normals are retained; AO and metallic maps are not fabricated from color.

Runtime uses shared cached textures with sRGB color, linear roughness, mipmaps and repeat wrapping. Fourteen opaque surface types are applied by `src/game/colorTextures.ts`; glass and water preserve their optical materials. Existing authored color maps are preserved. Generated colors multiply the model's material tint, preserving uniform colors and faction identification.

Tiles have two source pixels trimmed at each boundary to avoid atlas-neighbor contamination. Texture repetition may still be visible on very large uniform surfaces; this is not a claim of mathematically seamless source artwork.
