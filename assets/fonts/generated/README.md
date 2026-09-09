# Generated ornamental glyph masters

Generated with the built-in image generation tool from the user-provided Hyrule Castle Town lettering reference. No existing font outlines are used for the image-generated letter sets.

Design requirements: very bold narrow wedge-serifs; every capital and CJK menu glyph must carry structural white insets inside strokes (long slots, diamond interruptions, or curved channels). True lowercase retains ascenders and descenders. Black silhouettes on white allow contour tracing into fonts.

- latin-master.png: 13 × 4, A–Z followed by a–z.
- chinese-master.png: 10 × 8, 74 simplified Chinese menu characters.
- japanese-master.png: 10 × 9, 85 Japanese menu characters; grid lines are excluded from the sampled cells.
- hongkong-master.png: 10 × 8, 74 traditional Chinese menu characters.

Exact character order is in scripts/trace-generated-fonts.py. JSON files record sampled rectangles, contour counts and additional stroke-aware inlays. Image generation can introduce glyph variations; review actual word samples after any regeneration. Font glyphs are vectors; gold and shadows are applied by CSS.
