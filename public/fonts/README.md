# Legend Relic interface typefaces

Reference direction: the user's cream-gold, narrow serif “Hyrule Castle Town” image.
These are **renamed, modified OFL-derived fonts**, not a claim to have recovered the original font.

- **Legend Relic Latin**: 26 decorative uppercase and 26 genuine lowercase letters, digits and supported punctuation. Uppercase outlines derive from Cinzel Decorative Bold, compressed to 79% width and extended to 105% height. Lowercase and numerals derive from Cormorant Garamond at weight 700, 92% width / 113% height. Lowercase is not mapped to capitals. Original ascenders and descenders remain.
- **Legend Relic SC**: current Chinese interface characters, from Noto Serif SC at weight 800 with 94% width. Song-style triangular serifs and stroke contrast pair with the Latin display face.
- **Legend Relic JP**: current Japanese interface characters, from Noto Serif JP at weight 800 with 94% width, preserving Japanese regional glyph forms and kana.

`manifest.json` records character coverage, source URLs and SHA-256 hashes. TTF files are provided for inspection; the game loads WOFF2. New translations may require rebuilding the CJK subsets. Uncovered characters use the existing language-specific system serif fallback. Korean retains its existing serif fallback.

The gold fill and dark embossed shadow are CSS styling, not embedded color glyphs. Menus, buttons, settings and HUD use real Unicode text. The image logo remains artwork. Preview all 52 letters and CJK examples in [specimen.html](specimen.html).

## Rebuild

```bash
python3 -m venv /tmp/legend-font-build
/tmp/legend-font-build/bin/pip install fonttools brotli
/tmp/legend-font-build/bin/python scripts/build-interface-fonts.py --fetch
```

The script caches full CJK sources in a temporary directory and exports only interface subsets. Latin sources are in `assets/fonts/sources/`. Keep the four accompanying OFL license files when redistributing these derivatives. Upstream sources: [Cinzel Decorative](https://github.com/google/fonts/tree/main/ofl/cinzeldecorative), [Cormorant Garamond](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond), [Noto Serif SC](https://github.com/google/fonts/tree/main/ofl/notoserifsc), [Noto Serif JP](https://github.com/google/fonts/tree/main/ofl/notoserifjp).
