"""Extend the generated masters' carved-stroke grammar over all interface glyphs.
Run after build-interface-fonts.py and trace-generated-fonts.py. Uses licensed base
outlines for the extension, preserving generated masters. Requires Pillow/OpenCV.
"""
from pathlib import Path
import json, unicodedata
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/fonts'
manifest=json.loads((OUT/'manifest.json').read_text())
# Never rasterize already decorated outlines: repeated runs progressively shrink
# companion glyphs while master glyphs remain unchanged.
if manifest.get('ornamentalCoverage'):
 raise RuntimeError('Rebuild base fonts and trace masters before completing fonts again.')
report={}
for label in ['Latin','SC','JP','HK','KR']:
 face='legend-relic-'+label.lower()
 path=OUT/(face+'.ttf')
 font=TTFont(path)
 raster=ImageFont.truetype(str(path),512)
 masters=set(manifest.get('generated',{}).get(face,{}).get('characters',''))
 decorated=[]
 for cp,name in font.getBestCmap().items():
  char=chr(cp)
  if char in masters or unicodedata.category(char)[0] not in 'LN': continue
  canvas=Image.new('L',(680,740));ImageDraw.Draw(canvas).text((40,570),char,font=raster,fill=255,anchor='ls')
  mask=(np.array(canvas)>127).astype(np.uint8)*255
  distance=cv2.distanceTransform(mask,cv2.DIST_L2,5)
  holes=[]
  for i in range(4):
   cy,cx=np.unravel_index(distance.argmax(),distance.shape);radius=float(distance[cy,cx])
   if radius<2: break
   rx=radius*.48;ry=radius*2.5
   while True:
    points=np.array([[cx,cy-ry],[cx+rx,cy],[cx,cy+ry],[cx-rx,cy]],dtype=np.int32)
    probe=np.zeros_like(mask);cv2.fillPoly(probe,[points],255)
    if not np.any((probe>0)&(mask==0)):break
    ry*=.8
   cv2.fillPoly(mask,[points],0);holes.append(points.tolist())
   cv2.circle(distance,(int(cx),int(cy)),int(radius*6+12),0,-1)
  assert holes,(face,char,'no ornamental apertures')
  pen=TTGlyphPen(None)
  # Narrow the companion forms to match the generated, tall display masters.
  xs=.78 if label!='Latin' else 1
  ys=.95 if label!='Latin' else 1
  contours,_=cv2.findContours(mask,cv2.RETR_TREE,cv2.CHAIN_APPROX_SIMPLE)
  for contour in contours:
   if cv2.contourArea(contour)<1:continue
   points=cv2.approxPolyDP(contour,.35,True).reshape(-1,2)
   if len(points)<3:continue
   coords=[(round((x-40)*1000/512*xs),round((570-y)*1000/512*ys)) for x,y in points]
   pen.moveTo(coords[0])
   for xy in coords[1:]:pen.lineTo(xy)
   pen.closePath()
  glyph=pen.glyph();font['glyf'][name]=glyph
  advance,_=font['hmtx'][name];glyph.recalcBounds(font['glyf'])
  font['hmtx'][name]=(round(advance*xs),glyph.xMin)
  decorated.append(char)
 font.save(path);font.flavor='woff2';font.save(OUT/(face+'.woff2'))
 report[face]={'masterCharacters':''.join(sorted(masters)),'extendedCharacters':''.join(decorated),'extendedCount':len(decorated)}
 print(face,'masters',len(masters),'extended',len(decorated))
manifest['ornamentalCoverage']=report
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
