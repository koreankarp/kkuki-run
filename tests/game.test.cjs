const assert=require('node:assert/strict'),{load}=require('./game-harness.cjs');
const speed=load().g.targetSpeed;
assert.equal(speed(0,0),480);assert(speed(60,0)>=800);assert.equal(speed(600,16000),1040);
for(let t=1;t<=600;t++)assert(speed(t,0)>speed(t-1,0),'speed continues rising throughout all ten minutes');
for(const seed of [42,17,2026,12345,97]){
 const {g,tap}=load();g.start(seed);const kinds=new Set(),families=new Set();let jumps=0,second=0,rolling=0,lastHp=3;
 for(let step=0;step<120*610&&g.state.mode==='playing';step++){
  const s=g.state,p=s.p;for(const q of s.platforms){if(q.action)kinds.add(q.action);if(q.pattern)families.add(q.pattern)}
  const floor=s.platforms.find(q=>p.x+p.w>q.x&&p.x<q.x+q.w&&Math.abs(p.y+p.h-q.y)<5);
  if(p.onGround&&floor){
   const obstacle=s.obstacles.find(o=>!o.hit&&o.x>p.x&&o.x-p.x<(p.vx-(o.vx||0))*.3);
   if(floor.x+floor.w-p.x<80 || obstacle){tap();jumps++;if(obstacle?.kind==='rolling')rolling++;}
  }else if(p.jumpsUsed<2&&p.vy>-60){
   const next=s.platforms.find(q=>!q.optional&&q.x+q.w>p.x+40);
   if(next){const disc=p.vy*p.vy+2300*(next.y-p.y-p.h);const flight=disc>=0?(-p.vy+Math.sqrt(disc))/1150:0;if(p.x+p.vx*flight+10<next.x){tap();second++;}}
  }
  g.update(1/120);
  if(g.state.health<lastHp){if(process.env.TRACE)console.log(JSON.stringify({t:s.elapsed,p,near:s.platforms.filter(q=>q.x+q.w>p.x-100&&q.x<p.x+1600),o:s.obstacles.filter(o=>o.x+o.w>p.x-80&&o.x<p.x+300)}));lastHp=g.state.health;}
 }
 console.log(JSON.stringify({seed,mode:g.state.mode,health:g.state.health,time:g.state.elapsed,jumps,second,rolling,actions:[...kinds],score:g.state.score}));
 assert.equal(g.state.mode,'clear');assert.equal(g.state.health,3);assert.equal(kinds.size,11);assert.equal(families.size,9);assert(second>5, 'double-jump paths remain part of the course');assert(rolling>=60, 'rolling obstacles recur throughout the run');
}
console.log('PASS: five ten-minute courses with double jumps rolling obstacles and staircases, no damage or resets');
