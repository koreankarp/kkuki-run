const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function load(duration){
 const rects=[],draw=new Proxy({createLinearGradient:()=>({addColorStop(){}}),fillRect:(...args)=>rects.push(args)},{get:(o,k)=>o[k]||(()=>{})});
 const els=new Map();function el(id){if(!els.has(id))els.set(id,{style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(){},getContext:()=>draw});return els.get(id)}
 const ctx={Math,Set,Image:class{},HTMLButtonElement:class{},localStorage:{getItem(){return null},setItem(){}},document:{getElementById:el,addEventListener(){}},window:{addEventListener(){}},requestAnimationFrame(){},__YUKINA_TEST__:true};vm.createContext(ctx);
 for(const f of ['course-patterns.js','runner-physics.js','bandori-scenery.js','game.js']){let code=fs.readFileSync('docs/'+f,'utf8');if(duration&&f==='game.js')code=code.replace(/const DURATION = \d+,/, 'const DURATION = '+duration+',');vm.runInContext(code,ctx)}
 return {g:ctx.__YUKINA_TEST__,rects};
}
const {g,rects}=load();g.start();const s=g.state;s.p.x=1000;s.platforms[0].w=4000;
const missedCookie={x:800,y:180,cat:false},partialAmp={x:770,y:332,w:48,h:48,kind:'amp'},struckAmp={x:1010,y:332,w:48,h:48,kind:'amp'};
s.items.push(missedCookie);s.obstacles.push(partialAmp,struckAmp);g.update(1/120);
assert(g.state.items.includes(missedCookie),'missed cookie remains on the left of the viewport');assert(g.state.obstacles.includes(partialAmp),'partially visible obstacle retained');assert(g.state.obstacles.includes(struckAmp)&&struckAmp.hit,'collision does not erase obstacle');
g.draw();assert(rects.some(r=>r[0]===Math.round(struckAmp.x-g.state.camera)&&r[1]===332&&r[2]===48&&r[3]===48),'hit obstacle still rendered');
g.state.p.x=1450;g.update(1/120);assert(!g.state.items.includes(missedCookie));assert(!g.state.obstacles.includes(partialAmp));
const end=load(12.05).g;end.start();const e=end.state;const cookie={x:360,y:150},obstacle={x:440,y:332,w:48,h:48};e.items.push(cookie);e.obstacles.push(obstacle);for(let i=0;i<10;i++)end.update(1/120);
assert(end.state.items.includes(cookie));assert(end.state.obstacles.includes(obstacle));
console.log('PASS: left-edge cookie persistence, partial obstacle persistence, hit-obstacle drawing, offscreen cleanup, finish transition keeps visible entities');
