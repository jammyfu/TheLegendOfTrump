"""Give Han characters consistent cells and centered bearings after font generation.
Idempotent final step: preserves ornamental outlines and natural stroke widths.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen
ROOT=Path(__file__).resolve().parents[1]
for suffix in ['sc','jp','hk','kr']:
 path=ROOT/'public/fonts'/f'legend-relic-{suffix}.ttf'
 font=TTFont(path); count=0
 for cp,name in font.getBestCmap().items():
  if not (0x3400<=cp<=0x9fff or cp in (0x3000,0x3001,0x3002) or 0xff01<=cp<=0xff60):continue
  glyph=font['glyf'][name];glyph.recalcBounds(font['glyf'])
  if getattr(glyph,'numberOfContours',0):
   width=glyph.xMax-glyph.xMin; scale=min(1,620/max(width,1))
   shift=(750-width*scale)/2-glyph.xMin*scale
   pen=TTGlyphPen(None)
   font.getGlyphSet()[name].draw(TransformPen(pen,(scale,0,0,1,shift,0)))
   glyph=pen.glyph();font['glyf'][name]=glyph;glyph.recalcBounds(font['glyf'])
  font['hmtx'][name]=(750,getattr(glyph,'xMin',0));count+=1
 if count:
  font.save(path);font.flavor='woff2';font.save(path.with_suffix('.woff2'))
 print(suffix,count,'uniform CJK cells')
