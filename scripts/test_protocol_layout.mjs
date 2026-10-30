import assert from 'node:assert/strict';
import {isShortLandscape,boardBand} from '../js/pf/layout.js';
for(const [width,height] of [[568,320],[667,375],[740,360],[844,390],[896,414],[932,430],[1024,540]]) {
  assert(isShortLandscape(width,height));
  const rail=Math.min(320,Math.max(224,width*.34));
  for(const notch of [0,44]) {
    const dock={left:width-rail-4,top:4};
    const band=boardBand(width,height,{left:Math.max(6,notch),bottom:72},dock);
    assert(band.w>200&&band.h>200,`playable board at ${width}×${height}`);
    assert(band.x>=notch);
    assert(band.x+band.w<dock.left,'board must end before shop rail');
    assert(band.y+band.h<=height-8,'board must stay inside viewport');
  }
}
const short=boardBand(667,200,{left:8,bottom:72},{left:430,top:4});
assert(short.h<200);assert(short.y+short.h<=192,'never force a 200px board over controls');
assert(!isShortLandscape(390,844));assert(!isShortLandscape(1920,1080));
assert.deepEqual(boardBand(1920,1080,{bottom:60},{top:800}),{x:292,y:66,w:1260,h:728});
assert.deepEqual(boardBand(390,844,{bottom:100},{top:620}),{x:0,y:106,w:390,h:508});
console.log('Protocol layout: seven phone landscape sizes, safe areas, short viewport, portrait and desktop bounds passed');
