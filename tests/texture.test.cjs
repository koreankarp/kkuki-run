const fs=require('node:fs'),zlib=require('node:zlib'),vm=require('node:vm'),assert=require('node:assert/strict');
const png=fs.readFileSync('source-art/yukina-original.png');let w,h,depth,type,packed=[];
for(let p=8;p<png.length;){const n=png.readUInt32BE(p),t=png.toString('ascii',p+4,p+8),d=png.subarray(p+8,p+8+n);if(t==='IHDR'){w=d.readUInt32BE(0);h=d.readUInt32BE(4);depth=d[8];type=d[9];assert.equal(d[12],0)}if(t==='IDAT')packed.push(d);p+=n+12}
assert.equal(depth,8);assert.equal(type,2);const bpp=3,stride=w*bpp,raw=zlib.inflateSync(Buffer.concat(packed)),rgb=Buffer.alloc(w*h*3);let rp=0;
function paeth(a,b,c){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c}
for(let y=0;y<h;y++){const filter=raw[rp++];for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=3?rgb[i-3]:0,b=y?rgb[i-stride]:0,c=y&&x>=3?rgb[i-stride-3]:0;const predictors=[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)];rgb[i]=(raw[rp++]+predictors[filter])&255}}
const rgba=new Uint8ClampedArray(w*h*4);for(let i=0,j=0;i<rgb.length;i+=3,j+=4){rgba[j]=rgb[i];rgba[j+1]=rgb[i+1];rgba[j+2]=rgb[i+2];rgba[j+3]=255}
const scope={document:{}};vm.createContext(scope);vm.runInContext(fs.readFileSync('docs/sprite-renderer.js','utf8'),scope);scope.prepareYukinaPixels(rgba);
let transparent=0;for(let i=3;i<rgba.length;i+=4)if(rgba[i]===0)transparent++;
assert(transparent/(w*h)>.4);assert(transparent/(w*h)<.8);
let corners=0;for(let y=0;y<2;y++)for(let x=0;x<4;x++)for(const [dx,dy]of [[1,1],[382,1],[1,510],[382,510]]){assert.equal(rgba[((y*512+dy)*w+x*384+dx)*4+3],0);corners++}
// The colored silver hair and amber eye centers remain opaque after keying.
for(const [x,y]of [[306,121],[289,74],[272,73],[234,763]])assert.equal(rgba[(y*w+x)*4+3],255,`character pixel ${x},${y}`);
console.log(JSON.stringify({w,h,transparentPixels:transparent,transparentPercent:Math.round(transparent/(w*h)*100),transparentCorners:corners}));
