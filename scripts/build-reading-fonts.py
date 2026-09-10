"""Bundle readable local glyphs for every shipped UI string, without network fonts."""
from pathlib import Path
import json
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[1]
text = ''.join(p.read_text() for p in (ROOT / 'src').rglob('*')
               if p.suffix in {'.ts', '.tsx', '.css', '.json'})
# Decode JSON as well: escaped Unicode must be counted as the actual character.
text += json.dumps(json.loads((ROOT / 'src/game/translations.json').read_text()), ensure_ascii=False)
required = {ord(c) for c in text if not c.isspace()} | set(range(32, 127))
covered = set()
report = {}
for locale in ['SC', 'JP', 'HK', 'KR']:
    font = TTFont(Path('/tmp') / f'Legend-NotoSerif{locale}.ttf')
    available = set(font.getBestCmap()) & required
    options = subset.Options()
    sub = subset.Subsetter(options=options)
    sub.populate(unicodes=available)
    sub.subset(font)
    if 'fvar' in font:
        font = instantiateVariableFont(font, {'wght': 500}, inplace=True)
    font.flavor = 'woff2'
    target = ROOT / 'public/fonts' / f'legend-reading-{locale.lower()}.woff2'
    font.save(target)
    actual = set(TTFont(target).getBestCmap())
    assert available <= actual
    covered |= actual
    report[locale] = {'glyphs': len(actual), 'bytes': target.stat().st_size}
# Private-use icon codepoints and symbols can use the platform emoji/icon font.
missing_letters = ''.join(chr(c) for c in sorted(required - covered) if chr(c).isalnum())
assert not missing_letters, f'Missing UI letters: {missing_letters}'
(ROOT / 'public/fonts/reading-coverage.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
print('PASS: all current UI letters and digits have local reading glyphs.')
