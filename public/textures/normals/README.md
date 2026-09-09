# Game surface normal maps

17 deterministic, seamless 512×512 PNG data textures, generated from periodic height fields. These add surface grain to the low-poly models; they are not high-poly sculpt bakes and do not alter silhouettes. Original models and colors are preserved.

| Maps | Usage |
| --- | --- |
| metal, gold, paint, rubber | Weapons, armor, trim, helicopter body and rotor |
| stone, paving, roof | Estate walls, paths, roofs, fountain |
| wood, bark, leather | Props, desks, trunks, equipment |
| fabric | Clothing, flags, rugs, tents |
| grass, leaf | Ground, foliage, herbs |
| skin, hair | Character surface detail |
| glass, water | Windows and water surfaces |

Use tangent-space **OpenGL +Y**, RGB, `NoColorSpace`, repeat wrapping and mipmaps. Runtime strengths are subtle (0.08–0.60). Paving repeats match the existing color grid. Color textures alone use sRGB. Normal PNG rows run downward; the texture loader's default vertical flip maps them to UV coordinates.

`src/game/materials.ts` shares textures across meshes, classifies named materials, and creates face-projected local UVs when absent. Authored UVs and normal maps are preserved. The projection is intended for the current rigid low-poly models, not a replacement for artist-authored UVs on deforming organic meshes. UI artwork and unlit glow effects do not use normal maps.

Regenerate with `python scripts/generate-normal-maps.py` (NumPy and Pillow). `manifest.json` records files and suggested strengths. Validate integration with `node --import tsx --test tests/material-normals.test.ts` and `npm run build`.
