const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={Math};vm.createContext(ctx);vm.runInContext(fs.readFileSync('docs/course-patterns.js','utf8'),ctx);
let seed=983;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
let checked=0;const allActions=new Set(),allPlans=new Set(),exitHeights=new Set();
for(const pace of [480,760,1040]){
 const director=ctx.createCourseDirector();let y=380,previousMotion=0;
 for(let visit=0;visit<300;visit++){
  const previousPlans=[...director.seenPlans],previousFamilies=[...director.recentFamilies];
  const encounter=ctx.nextCourseEncounter(director,random,pace,y);
  assert(!previousPlans.includes(encounter.signature),'actual action order cannot repeat during the run');
  assert(!previousFamilies.includes(encounter.id),'recent families cannot recur immediately');
  allPlans.add(encounter.signature);
  for(const r of encounter.roofs){
   allActions.add(r.action);assert(Number.isFinite(r.width)&&r.width>=220&&r.gap>60);assert(r.y>=240&&r.y<=408);assert(y-r.y<=60);
   const flight=(550+Math.sqrt(550**2+2300*(r.y-y)))/1150;
   if(!r.doubleGap){
    for(const from of [y-previousMotion,y+previousMotion])for(const to of [r.y-(r.motion?.amplitude||0),r.y+(r.motion?.amplitude||0)]){
     const air=(550+Math.sqrt(550**2+2300*(to-from)))/1150,landing=pace*air-80;
     assert(landing+28>r.gap+8,r.action+' reachable even with opposing lift phases');
     assert(landing<r.gap+r.width-20,r.action+' safe landing width');
    }
   }else{assert(y>=344);assert(r.gap>pace*(flight+.1)+28+78,'double gap requires more range than an edge jump');}
   const gear=[...r.amps.map(x=>({x,w:48})),...r.cases.map(x=>({x,w:94}))].sort((a,b)=>a.x-b.x);
   for(let i=0;i<gear.length;i++){
    assert(gear[i].x>=pace*.85);assert(r.width-gear[i].x-gear[i].w>=pace*.7);
    if(i){const spacing=gear[i].x-gear[i-1].x;assert(spacing===88||spacing>pace,'equipment forms a clearable pair or separate jump');}
   }
   if(r.action==='rolling'){
    assert(r.rollers.length>=2&&r.rollers.length<=4);
    for(let i=1;i<r.rollers.length;i++){const seconds=(r.rollers[i]-r.rollers[i-1])/pace;assert(seconds>=1.24&&seconds<=1.51,'roller spacing leaves time to land and jump again');}
   }
   for(const lane of r.lanes){assert(lane.rise<=108);assert(lane.offset>=0&&lane.offset+lane.width<=r.width);}
   y=r.y;previousMotion=r.motion?.amplitude||0;checked++;
  }
  exitHeights.add(y);assert(director.recentPlans.length<=32&&director.recentFamilies.length<=3);
 }
}
assert.equal(allActions.size,11);assert(allPlans.size>180,'variety comes from action order, not small coordinate jitter');assert(exitHeights.size>25,'terrain does not reset to one height after every plan');
console.log(`PASS: ${checked} procedural roofs, ${allPlans.size} action orders, ${exitHeights.size} continuing exit heights, whole-run plan exclusion, opposing lift phases, gear clusters and landing bounds`);
