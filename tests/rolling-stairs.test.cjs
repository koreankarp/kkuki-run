const assert=require('node:assert/strict'),{load}=require('./game-harness.cjs');
function rollingTrial(pace,jump){
 const {g,tap,labels}=load({pace});g.start(42);const s=g.state;
 const floor={x:-1000,w:12000,y:380};s.platforms.splice(0,s.platforms.length,floor);s.items.length=0;s.obstacles.length=0;
 Object.assign(s.p,{x:160,y:316,vx:pace,vy:0,onGround:true});
 const o={x:950,y:332,w:48,h:48,kind:'rolling',platform:floor,vx:0,vy:0,rotation:0,active:false};s.obstacles.push(o);
 g.draw();
 let jumped=false;
 for(let i=0;i<400;i++){
  if(jump&&!jumped&&o.x-s.p.x<(s.p.vx-o.vx)*.3){tap();jumped=true;}
  g.update(1/120);
  if(g.state.health<3){assert(g.state.obstacles.includes(o),'hit object remains until offscreen');return false;}
  if(s.p.x>o.x+o.w+100&&s.p.onGround){assert(o.active&&o.rotation<0&&o.x<950);return true;}
 }
 throw Error('rolling trial timed out');
}
for(const pace of [480,760,1040]){
 assert(rollingTrial(pace,true),'timed jump clears rolling obstacle');
 assert(!rollingTrial(pace,false),'running into roller causes damage');
}
const {scope}=load();const o={x:1200,y:332,w:48,h:48,vx:0,vy:0,rotation:0,active:false,platform:{x:1000}};
assert(!scope.updateRollingObstacle(o,0,480,.1));assert.equal(o.x,1200);
assert(scope.updateRollingObstacle(o,600,480,.1));assert.equal(o.y,332);assert(o.x<1200);
for(let i=0;i<30;i++)scope.updateRollingObstacle(o,600,480,.1);
assert(o.y>332&&o.vy>0,'roller falls after passing the platform edge');

let stairTrials=0;
for(const pace of [480,760,1040])for(const seed of [42,2026,97]){
 const {g,scope,tap}=load({pace});let rng=seed;
 const random=()=>{rng=(rng*1664525+1013904223)>>>0;return rng/4294967296};
 const director=scope.createCourseDirector();let encounter;
 for(let i=0;i<100;i++){encounter=scope.nextCourseEncounter(director,random,pace,380);if(encounter.roofs.some(r=>r.stairStep===1))break;}
 const index=encounter.roofs.findIndex(r=>r.stairStep===1);assert(index>=0);
 const roofs=encounter.roofs.slice(index,index+4),rise=roofs[0].y-roofs[1].y;
 assert([36,40,44].includes(rise));assert(roofs[3].stairFinish&&roofs[3].width>=pace*2);
 g.start(seed);const s=g.state,startY=roofs[0].y+rise;
 const floors=[{x:-1000,w:2200,y:startY}],landed=new Set();let edge=1200;
 for(const r of roofs){const q={x:edge+r.gap,w:r.width,y:r.y,stairStep:r.stairStep,stairFinish:r.stairFinish};floors.push(q);edge=q.x+q.w;}
 s.platforms.splice(0,s.platforms.length,...floors);s.items.length=0;s.obstacles.length=0;
 Object.assign(s.p,{x:900,y:startY-64,vx:pace,vy:0,onGround:true});
 let finished=false;
 for(let i=0;i<1600;i++){
  const floor=floors.find(q=>s.p.x+s.p.w>q.x&&s.p.x<q.x+q.w&&Math.abs(s.p.y+s.p.h-q.y)<3);
  if(s.p.onGround&&floor){
   assert.equal(s.p.jumpsUsed,0,'each landing replenishes jumps');
   if(floor.stairStep)landed.add(floor.stairStep);
   if(floor.stairFinish){finished=true;break;}
   if(floor.x+floor.w-s.p.x<80)tap();
  }
  g.update(1/120);assert.equal(g.state.health,3,'stair jump must not cause damage');
 }
 assert(finished,'reaches resting roof');assert.deepEqual([...landed],[1,2,3],'lands on each ascending step in order');stairTrials++;
}
console.log(`PASS: rolling movement, rotation, edge falls, jump/damage at three speeds; ${stairTrials} consecutive staircase landings`);
