"""Fail when interface letters lack a local glyph or ornamental coverage."""
from pathlib import Path
import json, unicodedata
from fontTools.ttLib import TTFont
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/fonts'
m=json.loads((OUT/'manifest.json').read_text())
texts=json.loads((ROOT/'src/game/translations.json').read_text())
source=''.join(p.read_text() for p in (ROOT/'src').rglob('*') if p.suffix in ('.ts','.tsx'))
required={c for c in ''.join(texts)+''.join(''.join(v) for v in texts.values())+source if unicodedata.category(c)[0] in 'LN'}
covered=set();ornament=set()
for p in OUT.glob('legend-relic-*.ttf'):
 covered.update(map(chr,TTFont(p).getBestCmap()))
for data in m['ornamentalCoverage'].values():ornament.update(data['masterCharacters']+data['extendedCharacters'])
assert not required-covered, 'Missing glyphs: '+''.join(sorted(required-covered))
assert not required-ornament, 'Missing carved forms: '+''.join(sorted(required-ornament))
print(f'PASS: {len(required)} unique interface letters/digits have local ornamental glyphs.')
# Coverage alone cannot catch the repeated-rasterization shrink regression.
font=TTFont(OUT/'legend-relic-sc.ttf')
for char in '简体中文原创时之笛秒设置':
 glyph=font['glyf'][font.getBestCmap()[ord(char)]]
 width=glyph.xMax-glyph.xMin
 height=glyph.yMax-glyph.yMin
 assert 450 <= width <= 700 and 650 <= height <= 1000, (char, 'inconsistent UI glyph scale', width, height)
print('PASS: mixed master/companion settings glyphs retain consistent display scale.')
