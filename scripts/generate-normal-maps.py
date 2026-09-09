"""Deterministic, seamless OpenGL tangent-space data textures (not color images).
Requires numpy and Pillow. Run with the project's font/asset Python environment.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parents[1] / 'public/textures/normals'
OUT.mkdir(parents=True, exist_ok=True)
SIZE = 512
y, x = np.mgrid[0:SIZE, 0:SIZE] / SIZE
tau = np.pi * 2
rng = np.random.default_rng(1946)

def noise(seed, octaves=28):
    random = np.random.default_rng(seed)
    field = np.zeros_like(x)
    for _ in range(octaves):
        a, b = random.integers(-45, 46, 2)
        field += np.sin(tau * (a*x + b*y) + random.uniform(0, tau)) / octaves
    return field

n = noise(1)
grain = np.sin(tau*(12*x + .18*np.sin(tau*2*y)))
weave = np.sin(tau*32*x)*np.sin(tau*32*y)
seam = lambda axis: np.exp(-(np.sin(tau*2*axis)/.085)**2)
heights = {
    'metal': (.06*np.sin(tau*64*y) + .04*n, .22),
    'gold': (.025*np.sin(tau*48*y) + .035*n, .16),
    'paint': (.09*n, .24),
    'glass': (.008*np.sin(tau*x)*np.sin(tau*y), .08),
    'water': (.22*np.sin(tau*(3*x+2*y)) + .08*np.sin(tau*(7*x-4*y)), .40),
    'stone': (.5*n + .08*np.sin(tau*(3*x+2*y)), .55),
    'paving': (.1*n - .30*np.maximum(seam(x),seam(y)), .50),
    'roof': (.1*n - .18*seam(y) + .05*np.cos(tau*16*x), .45),
    'wood': (.16*grain + .06*np.sin(tau*(31*x+.3*np.sin(tau*y))) + .08*n, .40),
    'bark': (.3*grain + .16*n, .60),
    'leather': (.23*noise(7,60), .40),
    'fabric': (.1*weave + .045*n, .35),
    'grass': (.32*noise(9,70) + .06*np.sin(tau*(22*x+9*y)), .55),
    'leaf': (.10*np.cos(tau*8*x)+.10*np.cos(tau*(8*x+8*y)), .30),
    'skin': (.035*noise(12,60), .15),
    'hair': (.12*np.sin(tau*(24*x+.14*np.sin(tau*y))), .25),
    'rubber': (.11*n + .025*np.sin(tau*40*x), .30),
}
manifest = {'size': SIZE, 'space': 'tangent', 'convention': 'OpenGL +Y',
            'colorSpace': 'NoColorSpace', 'seamless': True, 'textures': {}}
for name, (height, strength) in heights.items():
    # Wrapped central differences; PNG rows run down, tangent V runs up.
    dx = (np.roll(height,-1,axis=1)-np.roll(height,1,axis=1))*SIZE/2
    dy = (np.roll(height,-1,axis=0)-np.roll(height,1,axis=0))*SIZE/2
    vectors = np.stack([-dx*.025, dy*.025, np.ones_like(x)], axis=-1)
    vectors /= np.linalg.norm(vectors,axis=-1,keepdims=True)
    pixels = np.rint((vectors*.5+.5)*255).clip(0,255).astype(np.uint8)
    Image.fromarray(pixels).save(OUT/f'{name}-normal.png', optimize=True)
    manifest['textures'][name] = {'file':f'{name}-normal.png','normalScale':strength}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Generated {len(heights)} seamless {SIZE}×{SIZE} normal maps in {OUT}')
