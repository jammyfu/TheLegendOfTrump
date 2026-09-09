# Legend Relic · Generated pierced typefaces

Reference direction: the user's cream-gold, narrow serif “Hyrule Castle Town” image.
The current display letters are traced from newly generated glyph masters following the reference. Every uppercase letter has stroke-specific slits, diamonds or curved inset channels. The 52 uppercase/lowercase letters are independent shapes, not substitutions from Cinzel or Cormorant.

- **Latin**: all 52 letters use generated outlines. Existing digits and punctuation remain OFL-derived fallbacks.
- **SC**: 74 Chinese menu/control glyphs use newly generated outlines.
- **JP**: 85 Japanese menu/control glyphs use newly generated outlines, with kana sizing preserved.
- **HK**: 74 Hong Kong traditional menu/control glyphs use newly generated outlines; remaining text has a local Noto Serif HK-derived fallback.

The generated CJK outlines receive two additional stroke-aware diamond/slot inlays where thick strokes permit them. Insets are placed inside measured stroke boundaries, not pasted across the glyph. The remaining interface letters use OFL-derived companion outlines extended with the same carved-stroke grammar. All current interface letters and digits are covered, including Korean. The extension is procedural outline design, not a claim that every glyph was image-generated.

Masters and per-glyph segmentation records are in `assets/fonts/generated/`. The first rejected plain-letter iterations are replaced by the fully pierced design.

`manifest.json` records character coverage, source URLs and SHA-256 hashes. TTF files are provided for inspection; the game loads WOFF2. New translations may require rebuilding the CJK subsets. Uncovered characters use the existing language-specific system serif fallback. Korean uses the local Legend Relic KR ornamental subset.

The gold fill and dark embossed shadow are CSS styling, not embedded color glyphs. Menus, buttons, settings and HUD use real Unicode text. The image logo remains artwork. Preview all 52 letters and CJK examples in [specimen.html](specimen.html).

## Rebuild

```bash
python3 -m venv /tmp/legend-font-build
/tmp/legend-font-build/bin/pip install fonttools brotli opencv-python-headless pillow
/tmp/legend-font-build/bin/python scripts/build-interface-fonts.py --fetch
/tmp/legend-font-build/bin/python scripts/trace-generated-fonts.py
/tmp/legend-font-build/bin/python scripts/complete-interface-fonts.py
/tmp/legend-font-build/bin/python scripts/check-interface-fonts.py
```

The script caches full CJK sources in a temporary directory and exports only interface subsets. Latin sources are in `assets/fonts/sources/`. Keep the six accompanying OFL license files when redistributing these derivatives. Upstream sources: [Cinzel Decorative](https://github.com/google/fonts/tree/main/ofl/cinzeldecorative), [Cormorant Garamond](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond), [Noto Serif SC](https://github.com/google/fonts/tree/main/ofl/notoserifsc), [Noto Serif JP](https://github.com/google/fonts/tree/main/ofl/notoserifjp).
