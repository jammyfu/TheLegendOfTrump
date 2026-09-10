import test from 'node:test';
import assert from 'node:assert/strict';
import { colorEnergyBand, createWarningSegments } from '../src/game/energyGeometry';
import { createRippleGeometry } from '../src/game/rippleGeometry';

test('water glow has no opaque dark backing and fades to zero light at the band edges',()=>{
  const g=colorEnergyBand(createRippleGeometry(),'#42cfff');
  const data=g.getAttribute('rippleData'),color=g.getAttribute('color');
  let peak=0;
  for(let i=0;i<data.count;i++){
    peak=Math.max(peak,color.getZ(i));
    if(data.getZ(i)<1e-5||data.getZ(i)>1-1e-5)assert.ok(color.getZ(i)<1e-5);
    assert.ok(color.getZ(i)>=color.getX(i));
  }
  assert.ok(peak>.99);g.dispose();
});
test('warning segments are open arcs inside the fixed damage boundary',()=>{
  const g=createWarningSegments();
  assert.equal(g.index!.count,96*6*.75);
  const p=g.getAttribute('position');
  for(let i=0;i<p.count;i++)assert.ok(Math.hypot(p.getX(i),p.getY(i))<1);
  g.dispose();
});
