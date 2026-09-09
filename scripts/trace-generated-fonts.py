"""Trace generated glyph master sheets into Unicode fonts (not substitute font outlines).
Requires fonttools, brotli, opencv-python-headless. Existing OFL subsets supply only
non-generated fallback characters. Run after build-interface-fonts.py.
"""
from pathlib import Path
import json, string, cv2, numpy as np
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/fonts'; SOURCE=ROOT/'assets/fonts/generated'

def runs(values):
 result=[];start=None
 for i,v in enumerate(list(values)+[False]):
  if v and start is None:start=i
  if not v and start is not None:result.append((start,i));start=None
 return result

def bands(mask,axis,merge=0):
 raw=runs(np.count_nonzero(mask,axis=axis)>2);joined=[]
 for a,b in raw:
  if joined and a-joined[-1][1]<=merge: joined[-1]=(joined[-1][0],b)
  else: joined.append((a,b))
 return joined

def trace(filename,chars,cols,face,latin=False):
 im=cv2.imread(str(SOURCE/filename),cv2.IMREAD_GRAYSCALE)
 assert im is not None
 mask=(im<125).astype(np.uint8)*255
 row_bands=([(round(i*mask.shape[0]/9)+5,round((i+1)*mask.shape[0]/9)-5) for i in range(9)] if filename=='japanese-master.png' else bands(mask,1,25 if latin else 14))
 expected=(len(chars)+cols-1)//cols
 assert len(row_bands)==expected,(filename,'rows',row_bands,expected)
 font=TTFont(OUT/(face+'.ttf')); cmap=font.getBestCmap(); items=[]
 for row,(y0,y1) in enumerate(row_bands):
  xs=bands(mask[y0:y1],0,3) if latin else [(round(i*mask.shape[1]/cols),round((i+1)*mask.shape[1]/cols)) for i in range(min(cols,len(chars)-row*cols))]
  count=min(cols,len(chars)-row*cols)
  assert len(xs)==count,(filename,'columns',row,xs,count)
  for col,(x0,x1) in enumerate(xs):
   char=chars[row*cols+col]
   # All generated characters are traced after visual review.
   bitmap=mask[y0:y1,x0:x1].copy()
   if filename=='japanese-master.png': bitmap[:,:5]=0;bitmap[:,-5:]=0
   ys,xx=np.nonzero(bitmap); top,bottom=ys.min(),ys.max()+1
   if latin: bitmap=bitmap[top:bottom]
   else: top=0;bottom=bitmap.shape[0]
   height=bitmap.shape[0]
   if latin:
    desc=char in 'gjpqy'; asc=char in 'bdfhklt' or char.isupper()
    target=740 if char.isupper() else 720 if asc else 700 if desc else 510
    baseline=-190 if desc else -20 if char=='Q' else 0
    scale=target/height; width_scale=scale*.90
   else:
    baseline=-70;scale=850/height;width_scale=min(scale*.92,880/bitmap.shape[1])
   contours,hierarchy=cv2.findContours(bitmap,cv2.RETR_TREE,cv2.CHAIN_APPROX_SIMPLE)
   pen=TTGlyphPen(None); kept=0
   for contour in contours:
    if cv2.contourArea(contour)<2: continue
    points=cv2.approxPolyDP(contour,.4,True).reshape(-1,2)
    if len(points)<3: continue
    coords=[(round(x*width_scale+35),round((height-y)*scale+baseline)) for x,y in points]
    pen.moveTo(coords[0])
    for point in coords[1:]:pen.lineTo(point)
    pen.closePath();kept+=1
   # Add two structural inlays to CJK outlines. Distance-to-edge selects wide
   # stroke interiors, so apertures follow actual strokes and never sever edges.
   inlays=[]
   if not latin:
    distance=cv2.distanceTransform(bitmap,cv2.DIST_L2,5)
    for _ in range(2):
     cy,cx=np.unravel_index(np.argmax(distance),distance.shape);radius=float(distance[cy,cx])
     if radius<2.2: break
     rx=max(1.1,radius*.46);ry=radius*2.2
     while ry>radius*.7:
      shape=np.array([[cx,cy-ry],[cx+rx,cy],[cx,cy+ry],[cx-rx,cy]],dtype=np.int32)
      probe=np.zeros_like(bitmap);cv2.fillPoly(probe,[shape],255)
      if not np.any((probe>0)&(bitmap==0)): break
      ry*=.8
     # Clockwise image contour becomes a clockwise hole after Y inversion.
     coords=[(round(x*width_scale+35),round((height-y)*scale+baseline)) for x,y in shape]
     pen.moveTo(coords[0])
     for point in coords[1:]:pen.lineTo(point)
     pen.closePath();inlays.append([int(cx),int(cy),float(rx),float(ry)])
     cv2.circle(distance,(int(cx),int(cy)),int(radius*5+8),0,-1)
   name=cmap.get(ord(char),f'generated{ord(char):04X}')
   if name not in font.getGlyphOrder():font.setGlyphOrder(font.getGlyphOrder()+[name])
   font['glyf'][name]=pen.glyph();font['hmtx'][name]=(round(bitmap.shape[1]*width_scale+70),35)
   for table in font['cmap'].tables:
    if table.isUnicode():table.cmap[ord(char)]=name
   items.append({'character':char,'box':list(map(int,[x0,y0+top,x1,y0+bottom])),'contours':kept,'inlays':inlays})
 font.save(OUT/(face+'.ttf'));font.flavor='woff2';font.save(OUT/(face+'.woff2'))
 (SOURCE/(filename+'.json')).write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n')
 print(face,len(items),'generated glyphs')
 return ''.join(i['character'] for i in items)

manifest=json.loads((OUT/'manifest.json').read_text())
for filename,chars,cols,face,latin in [
 ('latin-master.png',string.ascii_uppercase+string.ascii_lowercase,13,'legend-relic-latin',True),
 ('chinese-master.png','开始冒险操作指南设置语言总声音乐量效配来源标题探索交战直升机场继续返回完成视角与鼠镜头距离野度灵敏反转垂命中馈恢复默认防御跳跃翻滚锁定目攻击冲刺地图',10,'legend-relic-sc',False),
 ('hongkong-master.png','開始冒險操作指南設置語言總聲音樂量效配來源標題探索交戰直升機場繼續返回完成視角與鼠鏡頭距離野度靈敏反轉垂命中饋恢復默認防禦跳躍翻滾鎖定目攻擊衝刺地圖',10,'legend-relic-hk',False),
 ('japanese-master.png','冒険を始める操作ガイド設定言語マスター音声楽量効果サウントラックル探索戦闘ヘリの登場続けへ戻完了カメと距離視野角点感度上下反転命中時振動初期化防御ジャプ回避ロオ攻撃ダシュ',10,'legend-relic-jp',False),
]:
 if (SOURCE/filename).exists():
  made=trace(filename,chars,cols,face,latin)
  manifest.setdefault('generated',{})[face]={'master':filename,'characters':made,'count':len(made)}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
