const assert=require('node:assert/strict'),{load}=require('./game-harness.cjs');
function gapTrial(pace,fromY,rand,twice){
 const {g,scope,tap}=load({pace});g.start(42);const roof=scope.makeCourseRoof('double',()=>rand,pace,fromY),edge=1200,nextX=edge+roof.gap;
 const s=g.state;s.platforms.splice(0,s.platforms.length,{x:-1000,w:2200,y:fromY},{x:nextX,w:2000,y:roof.y});s.items.length=0;s.obstacles.length=0;
 Object.assign(s.p,{x:twice?edge-80:edge-1,y:fromY-64,vx:pace,vy:0,onGround:true});
 if(!twice)for(let i=0;i<12;i++)g.update(1/120);
 tap();let second=false;
 for(let i=0;i<400;i++){if(twice&&!second&&g.state.p.vy>=-60){tap();second=true;}g.update(1/120);if(g.state.health<3)return false;if(g.state.p.onGround&&g.state.p.x+28>nextX)return true;}return false;
}
let gaps=0;for(const pace of [480,760,1040])for(const y of [344,368,400])for(const r of [.01,.5,.99]){assert(!gapTrial(pace,y,r,false),'single late jump falls short');assert(gapTrial(pace,y,r,true),'second jump reaches opposite roof');gaps++;}
console.log(`PASS: ${gaps} gaps require and support double jumps at all speeds`);
