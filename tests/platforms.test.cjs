const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function load(){
 const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})}),elements=new Map();
 const el=id=>{if(!elements.has(id))elements.set(id,{style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(){},getContext:()=>ctx});return elements.get(id)};
 const scope={Math,Image:class{},localStorage:{getItem(){return null},setItem(){}},document:{getElementById:el,addEventListener(){}},window:{addEventListener(){}},requestAnimationFrame(){},__YUKINA_TEST__:true};vm.createContext(scope);
 for(const name of ['course-patterns.js','runner-physics.js','bandori-scenery.js','game.js'])vm.runInContext(fs.readFileSync('docs/'+name,'utf8'),scope);
 const g=scope.__YUKINA_TEST__;g.start(42);g.state.items.length=0;g.state.obstacles.length=0;
 return g;
}
const g=load(),lift={x:-1000,w:5000,y:380,baseY:380,surface:'lift',motion:{amplitude:24,rate:1.5,phase:0}};
g.state.platforms.splice(0,g.state.platforms.length,lift);
const cookie={x:1600,y:336,platform:lift,offsetY:-44};g.state.items.push(cookie);
for(let i=0;i<30;i++)g.update(1/120);
assert(g.state.p.onGround);assert(Math.abs(g.state.p.y+64-lift.y)<1e-7);assert.equal(cookie.y,lift.y-44);assert(lift.y>380);
const y=lift.y;g.pause();for(let i=0;i<120;i++)g.update(1/120);assert.equal(lift.y,y,'pause freezes platforms too');g.pause();
for(let i=0;i<30;i++)g.update(1/120);assert(g.state.p.onGround);assert(Math.abs(g.state.p.y+64-lift.y)<1e-7);assert.equal(cookie.y,lift.y-44);
g.action();for(let i=0;i<15;i++)g.update(1/120);assert(!g.state.p.onGround);assert(g.state.p.y+64<lift.y-50,'jump detaches from lift');
console.log('PASS: lift support, moving cookies, pause, jumping off lifts');
