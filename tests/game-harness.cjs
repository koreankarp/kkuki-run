const fs=require('node:fs'),vm=require('node:vm');
const src='docs/';
function load({pace}={}){
 const labels=[],rects=[],ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),fillText:t=>labels.push(t),fillRect:(...r)=>rects.push(r)},{get:(o,k)=>o[k]||(()=>{})});
 const els=new Map();function el(id){if(!els.has(id))els.set(id,{open:false,style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(){},getContext:()=>ctx});return els.get(id)}
 class Button{}
 const scope={Math,Image:class{},HTMLButtonElement:Button,localStorage:{getItem(){return null},setItem(){}},document:{getElementById:el,addEventListener(){}},window:{addEventListener(){}},requestAnimationFrame(){},__YUKINA_TEST__:true};
 vm.createContext(scope);
 for(const name of ['course-patterns.js','runner-physics.js','bandori-scenery.js','game.js']){let code=fs.readFileSync(src+name,'utf8');if(pace&&name==='game.js')code=code.replace('START_SPEED = 480, TOP_SPEED = 1040',`START_SPEED = ${pace}, TOP_SPEED = ${pace+440}`);vm.runInContext(code,scope)}
 const g=scope.__YUKINA_TEST__,tick=n=>{for(let i=0;i<n;i++)g.update(1/120)},tap=()=>{g.pressInput('test');g.releaseInput('test')};
 return {g,tick,tap,scope,el,Button,labels,rects};
}
module.exports={load};
