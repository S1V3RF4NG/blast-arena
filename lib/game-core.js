
export const W=13,H=11, MAX_PLAYERS=4;
export const COLORS=["#ff4d6d","#42d9ff","#ffe45c","#8cff6b"];
const STARTS=[[1,1],[11,9],[11,1],[1,9]];
const id=()=>Math.random().toString(36).slice(2,10);
const inside=(x,y)=>x>=0&&y>=0&&x<W&&y<H;
const key=(x,y)=>`${x},${y}`;
export function freshArena(){
  const walls=[], crates=[];
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    if(x===0||y===0||x===W-1||y===H-1||(x%2===0&&y%2===0)) walls.push(key(x,y));
    else if(!STARTS.some(([sx,sy])=>Math.abs(sx-x)+Math.abs(sy-y)<=1) && Math.random()<.72) crates.push(key(x,y));
  }
  return {walls,crates,bombs:[],flames:[],items:[]};
}
export function newGame(players){
 return {phase:"playing",round:1,players:players.map((p,i)=>({...p,x:STARTS[i][0],y:STARTS[i][1],alive:true,bombsMax:1,bombsUsed:0,range:2,speed:1,moveAt:0, wins:p.wins||0})),arena:freshArena(),roundEndsAt:Date.now()+180000,lastTick:Date.now(),winner:null,matchWinner:null,feed:["ROUND 1 — FIGHT!"]};
}
export function applyInput(g, playerId, input, now=Date.now()){
 if(g.phase!=="playing") return g;
 const p=g.players.find(q=>q.id===playerId); if(!p||!p.alive)return g;
 const a=g.arena, occupied=new Set(a.walls.concat(a.crates,a.bombs.map(b=>key(b.x,b.y))));
 if(input.bomb && p.bombsUsed<p.bombsMax && !a.bombs.some(b=>b.owner===p.id&&b.x===p.x&&b.y===p.y)){
   a.bombs.push({id:id(),owner:p.id,x:p.x,y:p.y,range:p.range,at:now+2200});p.bombsUsed++;
 }
 const d=input.dir;
 if(d && now>=p.moveAt){
   const dirs={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]},v=dirs[d];
   if(v){const nx=p.x+v[0],ny=p.y+v[1];if(inside(nx,ny)&&!occupied.has(key(nx,ny))){p.x=nx;p.y=ny;p.moveAt=now+(p.speed>=2?105:155);}}
 }
 return g;
}
function explode(g,b,now){
 const a=g.arena, cells=[[b.x,b.y]];
 for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) for(let n=1;n<=b.range;n++){
   const x=b.x+dx*n,y=b.y+dy*n,k=key(x,y);
   if(a.walls.includes(k))break;
   cells.push([x,y]);
   if(a.crates.includes(k)){a.crates=a.crates.filter(v=>v!==k);if(Math.random()<.48){const types=["bomb","range","speed"];a.items.push({x,y,type:types[Math.floor(Math.random()*3)]});}break;}
 }
 for(const [x,y] of cells){a.flames.push({x,y,until:now+550});for(const chained of a.bombs.filter(q=>q.x===x&&q.y===y))chained.at=now;}
 for(const p of g.players) if(p.alive&&cells.some(([x,y])=>x===p.x&&y===p.y)){p.alive=false;p.bombsUsed=Math.max(0,p.bombsUsed-1);g.feed.unshift(`${p.name} GOT BLASTED!`);}
}
export function tick(g,now=Date.now()){
 if(g.phase==="roundover"&&now>=g.nextRoundAt){
   g.round++;const reset=newGame(g.players);g.phase="playing";g.arena=reset.arena;g.players=reset.players;g.roundEndsAt=now+180000;g.feed.unshift(`ROUND ${g.round} — FIGHT!`);delete g.nextRoundAt;g.lastTick=now;return g;
 }
 if(g.phase!=="playing")return g;
 const a=g.arena;
 a.flames=a.flames.filter(f=>f.until>now);
 for(const b of [...a.bombs].filter(b=>b.at<=now)){explode(g,b,now);a.bombs=a.bombs.filter(q=>q.id!==b.id);const owner=g.players.find(p=>p.id===b.owner);if(owner)owner.bombsUsed=Math.max(0,owner.bombsUsed-1);}
 for(const p of g.players) if(p.alive){const item=a.items.find(i=>i.x===p.x&&i.y===p.y);if(item){if(item.type==="bomb")p.bombsMax=Math.min(5,p.bombsMax+1);if(item.type==="range")p.range=Math.min(7,p.range+1);if(item.type==="speed")p.speed=2;a.items=a.items.filter(i=>i!==item);g.feed.unshift(`${p.name} POWER UP!`);}}
 const alive=g.players.filter(p=>p.alive);
 if(alive.length<=1 || now>=g.roundEndsAt){
   const roundWinner=alive.length===1?alive[0]:g.players.slice().sort((a,b)=>a.alive===b.alive?0:(a.alive?-1:1))[0];
   if(roundWinner){roundWinner.wins++;g.winner=roundWinner.id;g.feed.unshift(`${roundWinner.name} WINS ROUND ${g.round}!`);}
   if(g.round>=3){g.phase="finished";g.matchWinner=g.players.slice().sort((a,b)=>b.wins-a.wins)[0]?.id||null;g.feed.unshift("MATCH COMPLETE!");}
   else {g.phase="roundover";g.nextRoundAt=now+2800;}
 }
 g.lastTick=now;return g;
}
export function publicGame(g){return g?{...g,players:g.players.map(({id,name,x,y,alive,bombsMax,range,speed,wins})=>({id,name,x,y,alive,bombsMax,range,speed,wins}))}:null;}
