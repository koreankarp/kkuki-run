'use strict';
// Original Michelle ball pixel drawing; no remote assets.
function createBandoriScenery(ctx, rect, label, cacheSprites = true) {
  let michelleTile = null;
  function oval(x, y, rx, ry, color) {
    for (let row = -ry; row < ry; row += 2) {
      const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - ((row + 1) / ry) ** 2)) / 2) * 2;
      rect(x - half, y + row, half * 2, 2, color);
    }
  }
  function star(x, y, color) {
    const rows = ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'];
    rows.forEach((row, j) => [...row].forEach((cell, i) => { if (cell === '#') rect(x + i, y + j, 1, 1, color); }));
  }
  function michelle(x, y, rotation) {
    if (cacheSprites && !michelleTile && typeof document !== 'undefined' && document.createElement) {
      michelleTile = document.createElement('canvas'); michelleTile.width = michelleTile.height = 48;
      const tileCtx = michelleTile.getContext('2d');
      const pixel = (a,b,w,h,c) => { tileCtx.fillStyle = c; tileCtx.fillRect(a,b,w,h); };
      createBandoriScenery(tileCtx, pixel, () => {}, false).michelle(0, 0, 0);
    }
    ctx.save(); ctx.translate(Math.round(x + 24), Math.round(y + 24)); ctx.rotate(rotation);
    if (michelleTile) { ctx.drawImage(michelleTile, -24, -24); ctx.restore(); return; }
    // Round ears, pink fur, star eyes and the large cream muzzle stay inside 48px.
    for (const ear of [-14, 14]) {
      oval(ear, -16, 8, 8, '#713c62'); oval(ear, -16, 6, 6, '#e69abe'); oval(ear, -16, 3, 4, '#f7c5d7');
    }
    oval(0, 2, 23, 22, '#713c62'); oval(0, 1, 21, 20, '#e69abe');
    oval(-3, -4, 17, 14, '#f1accb');
    oval(0, 10, 15, 12, '#fff0de');
    star(-13, -7, '#513849'); star(6, -7, '#513849');
    rect(-3, 2, 6, 3, '#513849'); rect(-1, 5, 2, 2, '#513849');
    rect(-8, 9, 16, 4, '#513849'); rect(-6, 13, 12, 4, '#513849');
    rect(-4, 16, 8, 2, '#c26383'); rect(-7, 9, 14, 2, '#fffaf0');
    rect(-17, 4, 4, 2, '#d879a5'); rect(13, 4, 4, 2, '#d879a5');
    ctx.restore();
  }
  function cookieBox(x, y, w, h) {
    const flat = w > h;
    // Keep the complete box silhouette within the existing collision rectangle.
    rect(x, y, w, h, '#684332');
    rect(x + 2, y + 2, w - 4, h - 4, '#bc8659');
    rect(x + 3, y + 2, w - 6, 7, '#edc595');
    rect(x + 2, y + 9, w - 4, 2, '#8d583c');
    rect(x + w - 6, y + 11, 4, h - 13, '#9b6848');
    rect(x + 4, y + h - 5, w - 10, 2, '#d9a571');
    const ribbonX = x + (flat ? 14 : 8);
    rect(ribbonX, y + 2, 6, h - 4, '#ac657d');
    rect(ribbonX + 1, y + 2, 2, h - 4, '#e6a9b8');
    const cx = x + (flat ? 53 : 28), cy = y + (flat ? 19 : 28);
    rect(cx - (flat ? 22 : 13), cy - 10, flat ? 44 : 26, 20, '#f4ddad');
    oval(cx, cy, 9, 9, '#a86e40'); oval(cx, cy - 1, 7, 7, '#efbb73');
    for (const [dx,dy] of [[-3,-4],[3,-2],[-2,3],[4,3]]) rect(cx + dx, cy + dy, 2, 2, '#754633');
    if (flat) {
      rect(cx - 19, cy - 3, 6, 2, '#bb9566'); rect(cx + 13, cy - 3, 6, 2, '#bb9566');
      rect(cx - 17, cy + 2, 4, 2, '#bb9566'); rect(cx + 13, cy + 2, 4, 2, '#bb9566');
    } else {
      rect(x + 20, y + 40, 17, 2, '#79513c');
    }
  }
  function runningCat(x, feet, index, phase, airborne) {
    const coats = [['#e5c49b','#a77454'], ['#deddeb','#9694b2'], ['#9a99ad','#555468'], ['#efd5b5','#d19269']];
    const [fur, shade] = coats[index % coats.length];
    const stride = Math.floor(phase) % 4, bob = airborne ? -1 : stride % 2;
    const y = feet - 20 + bob;
    // The tail and alternating paw pairs make a compact, right-facing running pose.
    rect(x - 12,y + 4,9,4,shade); rect(x - 15,y,4,7,fur);
    rect(x - 7,y + 5,19,10,shade); rect(x - 6,y + 4,18,8,fur);
    const legs = airborne ? [-2,2] : [[-3,3],[0,0],[3,-3],[0,0]][stride];
    rect(x - 5 + legs[0],y + 13,4,6 - bob,fur);
    rect(x + 7 + legs[1],y + 13,4,6 - bob,fur);
    rect(x + 5,y - 3,4,8,shade); rect(x + 14,y - 3,4,8,shade);
    rect(x + 6,y - 2,2,4,'#e9a6b5'); rect(x + 15,y - 2,2,4,'#e9a6b5');
    rect(x + 4,y + 1,16,10,fur); rect(x + 15,y + 7,7,4,'#f3e6d2');
    rect(x + 14,y + 3,2,3,'#3c3545'); rect(x + 20,y + 7,2,2,'#b97083');
    rect(x + 5,y + 11,11,2,['#c88fae','#8bbdd4','#dfbd7f','#b199db'][index]);
    rect(x + 10,y + 13,2,2,'#f7d885');
    rect(x - 3,y + 5,3,5,shade);
  }
  return { michelle, cookieBox, runningCat };
}
