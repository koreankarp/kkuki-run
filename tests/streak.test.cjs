const assert=require('node:assert/strict'),{load}=require('./game-harness.cjs');
const {g,tick,el}=load();g.start(42);
const feed=n=>{for(let i=0;i<n;i++)g.collect({x:g.state.p.x,y:g.state.p.y,cat:i%2===0});};
feed(29);assert.equal(g.state.streakTier,0);const item={x:160,y:330,cat:true};g.collect(item);g.collect(item);assert.equal(g.state.streak,30);assert.equal(g.state.streakTier,1);
for(const [count,tier] of [[120,2],[300,3],[700,4]]){feed(count-g.state.streak-1);assert.equal(g.state.streakTier,tier-1);feed(1);assert.equal(g.state.streakTier,tier);}
assert(el('streak').textContent.includes('오로라'));
g.state.items.length=0;g.state.obstacles.length=0;g.state.platforms.splice(0,g.state.platforms.length,{x:-1000,w:100000,y:380});
tick(120);assert.equal(g.state.streak,700,'missing cookies does not break streak');assert(g.state.streakTrail.length>0&&g.state.streakTrail.length<=26);
const frozen=JSON.stringify(g.state.streakTrail);g.pause();tick(120);g.draw();assert.equal(JSON.stringify(g.state.streakTrail),frozen);assert.equal(g.state.streak,700);g.pause();
g.damage();assert.equal(g.state.streak,0);assert.equal(g.state.streakTier,0);assert.equal(g.state.streakTrail.length,0);
feed(30);g.damage();assert.equal(g.state.streak,30,'ignored damage during invulnerability does not reset');
g.damage(true);assert.equal(g.state.streak,0,'fall resets streak');
feed(120);g.start(42);assert.equal(g.state.streak,0);assert.equal(g.state.streakTier,0);assert.equal(g.state.streakTrail.length,0);
g.damage(true);g.damage(true);g.damage(true);g.collect({x:0,y:0});assert.equal(g.state.streak,0,'finished runs cannot collect');
console.log('PASS: all streak tiers, one count per cookie, misses, pause, bounded trails, hit/fall resets, restart and finished runs');
for(const [count,tier,multiplier] of [[29,0,1],[30,1,1.5],[120,2,2],[300,3,2.5],[700,4,3]]){
 const {g,tick,tap}=load();g.start(42);
 for(let i=0;i<count-1;i++)g.collect({x:0,y:0});
 const before=g.state.score;g.collect({x:0,y:0});assert.equal(g.state.score-before,10*multiplier,'threshold cookie earns its new multiplier');
 if(tier){const score=g.state.score;const catCookie={x:0,y:0,cat:true};g.collect(catCookie);g.collect(catCookie);assert.equal(g.state.score-score,30*multiplier,'cat cookie receives multiplier exactly once');}
 assert.equal(g.state.scoreMultiplier,multiplier);
 g.state.items.length=0;g.state.obstacles.length=0;g.state.platforms.splice(0,g.state.platforms.length,{x:-1000,w:100000,y:380});
 tick(90);const followers=g.followingCats();assert.equal(followers.length,tier);
 for(const cat of followers){assert(cat.x<g.state.p.x-24);assert.equal(cat.feet,380);}
 tap();tick(35);if(tier)assert(g.followingCats().some(cat=>cat.airborne&&cat.feet<380),'cats follow jumping trajectory');
 const frozen=JSON.stringify(g.followingCats());g.pause();tick(120);assert.equal(JSON.stringify(g.followingCats()),frozen);g.pause();
 g.damage();assert.equal(g.followingCats().length,0);assert.equal(g.state.scoreMultiplier,1);
 const base=g.state.score;g.collect({x:0,y:0});assert.equal(g.state.score-base,10);
 g.draw();
}
console.log('PASS: stage multipliers including threshold and special cookies, 0–4 followers, jumping, pause and damage reset');
