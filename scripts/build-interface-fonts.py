"""Build renamed OFL-derived display fonts. Requires fonttools[woff] (fonttools + brotli).
CJK full source fonts are cached outside the repository; --fetch downloads missing sources.
"""
from pathlib import Path
import argparse, json, tempfile, urllib.request, hashlib, string
from fontTools.ttLib import TTFont
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/fonts'
SOURCES = ROOT / 'assets/fonts/sources'
parser = argparse.ArgumentParser(); parser.add_argument('--fetch', action='store_true'); args = parser.parse_args()
base = 'https://raw.githubusercontent.com/google/fonts/main/ofl/'
locations = {
 'caps': (SOURCES/'CinzelDecorative-Bold.ttf', 'cinzeldecorative/CinzelDecorative-Bold.ttf'),
 'text': (SOURCES/'CormorantGaramond.ttf', 'cormorantgaramond/CormorantGaramond%5Bwght%5D.ttf'),
 'hk': (Path('/tmp/Legend-NotoSerifHK.ttf'), 'notoserifhk/NotoSerifHK%5Bwght%5D.ttf'),
 'zh': (Path(tempfile.gettempdir())/'Legend-NotoSerifSC.ttf', 'notoserifsc/NotoSerifSC%5Bwght%5D.ttf'),
 'ja': (Path(tempfile.gettempdir())/'Legend-NotoSerifJP.ttf', 'notoserifjp/NotoSerifJP%5Bwght%5D.ttf'),
}
# /tmp and macOS tempfile can differ; reuse the existing downloads when available.
for key in ['zh','ja']:
 p,url = locations[key]
 existing = Path('/tmp')/p.name
 if existing.exists(): locations[key]=(existing,url)
OUT.mkdir(parents=True,exist_ok=True); SOURCES.mkdir(parents=True,exist_ok=True)
for path,url in locations.values():
 if not path.exists():
  if not args.fetch: raise RuntimeError(f'Missing source {path}; run with --fetch')
  path.write_bytes(urllib.request.urlopen(base+url).read())
for family in ['cinzeldecorative','cormorantgaramond','notoserifsc','notoserifjp','notoserifhk']:
 p=OUT/(family+'-OFL.txt')
 if not p.exists():
  if not args.fetch: raise RuntimeError(f'Missing license {p}; run with --fetch')
  p.write_bytes(urllib.request.urlopen(base+family+'/OFL.txt').read())
translations=json.loads((ROOT/'src/game/translations.json').read_text())
all_source=''.join(p.read_text() for p in (ROOT/'src').rglob('*') if p.suffix in ['.ts','.tsx'])
# Include strings in source plus dictionary keys/values; use locale-specific CJK glyph forms.
zh_text=''.join(translations)+all_source+'简体中文日本語'
ja_text=''.join(row[1] for row in translations.values())+'日本語简体中文'
latin=set(range(32,127)) | {ord(c) for c in ''.join(translations)+''.join(''.join(v) for v in translations.values()) if ord(c)<0x3000}
# Hangul uses the existing Korean serif fallback; CJK fonts do not pretend to cover it.
cjk=lambda text:{ord(c) for c in text if 0x3000<=ord(c)<=0x9fff or 0xff00<=ord(c)<=0xffef}

def load(key,chars,weight=700):
 font=TTFont(locations[key][0]); opts=subset.Options(); opts.layout_features=[]
 sub=subset.Subsetter(options=opts);sub.populate(unicodes=chars);sub.subset(font)
 if 'fvar' in font: font=instantiateVariableFont(font,{'wght':weight},inplace=True)
 return font
caps=load('caps',set(map(ord,string.ascii_uppercase)))
text=load('text',latin)
manifest={}
def build(name,characters,pick):
 glyphs={}; metrics={}; cmap={}
 pen=TTGlyphPen(None); glyphs['.notdef']=pen.glyph(); metrics['.notdef']=(500,0)
 for cp in sorted(characters):
  font,xscale,yscale=pick(cp); source_name=font.getBestCmap().get(cp)
  if not source_name: continue
  factor=1000/font['head'].unitsPerEm
  gs=font.getGlyphSet(); pen=TTGlyphPen(gs)
  gs[source_name].draw(TransformPen(pen,(factor*xscale,0,0,factor*yscale,0,0)))
  glyph=pen.glyph(); glyph.recalcBounds(None)
  gn=f'uni{cp:04X}'; glyphs[gn]=glyph;cmap[cp]=gn
  advance=round(font['hmtx'][source_name][0]*factor*xscale)+10
  metrics[gn]=(advance,getattr(glyph,'xMin',0))
 fb=FontBuilder(1000,isTTF=True);fb.setupGlyphOrder(list(glyphs));fb.setupCharacterMap(cmap)
 fb.setupGlyf(glyphs);fb.setupHorizontalMetrics(metrics);fb.setupHorizontalHeader(ascent=1000,descent=-280)
 fb.setupNameTable({'familyName':name,'styleName':'Regular','uniqueFontIdentifier':name+'-1.0','fullName':name,'psName':name.replace(' ',''),'version':'Version 1.000','licenseDescription':'SIL Open Font License 1.1; see accompanying OFL files.'})
 fb.setupOS2(sTypoAscender=1000,sTypoDescender=-280,usWinAscent=1150,usWinDescent=350,usWeightClass=700)
 fb.setupPost();fb.setupMaxp();font=fb.font
 filename=name.lower().replace(' ','-')
 font.save(OUT/(filename+'.ttf'));font.flavor='woff2';font.save(OUT/(filename+'.woff2'))
 manifest[name]={'characters':''.join(chr(cp) for cp in sorted(cmap)), 'count':len(cmap),'woff2':filename+'.woff2'}
 return font
# Condensed decorative capitals, real lowercase with ascenders/descenders; not small-cap remapping.
build('Legend Relic Latin',latin,lambda cp:(caps,.79,1.05) if 65<=cp<=90 else (text,.92,1.13))
for lang,label,chars in [('zh','SC',cjk(zh_text)),('ja','JP',cjk(ja_text)),('hk','HK',cjk(''.join(row[3] for row in translations.values())+'繁體中文香港'))]:
 font=load(lang,chars,800)
 missing=chars-set(font.getBestCmap())
 if missing: print('Source lacks:', ''.join(map(chr,sorted(missing))))
 build('Legend Relic '+label,chars,lambda cp:(font,.94,1.0))
manifest['sources']={k:{'url':base+url,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()} for k,(path,url) in locations.items()}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
for name,data in manifest.items():
 if 'count' in data: print(name,data['count'],'characters', (OUT/data['woff2']).stat().st_size,'bytes')
