# Balanced adventure surfaces

32 GPT Image color surfaces cover terrain, architecture, vegetation, clothing,
equipment and props. `source-0.png` and `source-1.png` preserve the generated
atlases. Roughness is derived from these images, not independently generated.
Existing subtle normal maps are reused by material family.

`model-coverage.json` records the classification of 20 GLB assets. Existing
authored color maps and optical glass/water materials are preserved. Runtime
UV projection uses physical dimensions so long lawn strips do not stretch.
Generated colors use 65% chroma with moderated tint and normal strength to
avoid fluorescent vegetation while retaining the stylized palette.
