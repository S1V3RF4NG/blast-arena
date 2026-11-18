
import { getStore } from "@netlify/blobs";
import { newGame, applyInput, tick, publicGame, MAX_PLAYERS } from "../../lib/game-core.js";

const store = getStore({ name: "blast-arena-rooms", consistency: "strong" });
const json = (data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
const cleanName = s => String(s||"PLAYER").trim().replace(/[<>]/g,"").slice(0,14)||"PLAYER";
const validCode = s => /^[A-Z]{4}$/.test(String(s||"").toUpperCase());
async function read(code){return await store.getWithMetadata(code,{consistency:"strong",type:"json"});}
async function mutate(code,fn,create=false){
  for(let attempt=0;attempt<8;attempt++){
    const entry=await read(code);
    if(!entry&&!create)return {error:"ROOM_NOT_FOUND"};
    const state=entry?entry.data:null;
    const next=await fn(state);
    let result;
    if(entry) result=await store.setJSON(code,next,{onlyIfMatch:entry.etag});
    else result=await store.setJSON(code,next,{onlyIfNew:true});
    if(result.modified)return {state:next};
  }
  return {error:"ROOM_BUSY"};
}
export default async (req)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{allow:"GET, POST, OPTIONS"}});
  if(req.method!=="POST"&&req.method!=="GET")return json({error:"METHOD_NOT_ALLOWED"},405);
  try{
    const input=req.method==="GET"?Object.fromEntries(new URL(req.url).searchParams):await req.json();
    const action=String(input.action||"state");
    let code=String(input.code||"").toUpperCase();
    if(action==="create"){
      const name=cleanName(input.name);let made;
      for(let i=0;i<30;i++){
        code=Array.from({length:4},()=>"ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random()*24)]).join("");
        const player={id:crypto.randomUUID(),name,ready:true,wins:0};
        const room={code,host:player.id,phase:"lobby",players:[player],createdAt:Date.now()};
        made=await store.setJSON(code,room,{onlyIfNew:true});
        if(made.modified)return json({ok:true,code,playerId:player.id,room});
      }
      return json({error:"CODE_GENERATION_FAILED"},503);
    }
    if(!validCode(code))return json({error:"INVALID_CODE"},400);
    if(action==="join"){
      const result=await mutate(code,room=>{
        if(!room)return null;
        if(room.phase!=="lobby")throw new Error("GAME_ALREADY_STARTED");
        if(room.players.length>=MAX_PLAYERS)throw new Error("ROOM_FULL");
        const baseName=cleanName(input.name);
        const name=room.players.some(p=>p.name.toLowerCase()===baseName.toLowerCase())?`${baseName.slice(0,10)}${room.players.length+1}`:baseName;
        room.players.push({id:crypto.randomUUID(),name,ready:true,wins:0});
        return room;
      });
      if(result.error)return json({error:result.error},404);
      const p=result.state.players[result.state.players.length-1];
      return json({ok:true,code,playerId:p.id,room:result.state});
    }
    if(action==="state"){
      const entry=await read(code);if(!entry)return json({error:"ROOM_NOT_FOUND"},404);
      let state=entry.data;
      if(state.phase==="playing"||state.phase==="roundover"){
        const result=await mutate(code,s=>tick(s,Date.now()));
        if(result.state)state=result.state;
      }
      return json({ok:true,room:state});
    }
    const pid=String(input.playerId||"");
    const result=await mutate(code,room=>{
      if(!room)throw new Error("ROOM_NOT_FOUND");
      const player=room.players.find(p=>p.id===pid);
      if(!player)throw new Error("PLAYER_NOT_IN_ROOM");
      if(action==="start"){
        if(room.host!==pid)throw new Error("HOST_ONLY");
        if(room.players.length<2)throw new Error("NEED_TWO_PLAYERS");
        if(room.phase!=="lobby")return room;
        const players=room.players.map(p=>({...p,wins:0}));
        return {...room,...newGame(players)};
      }
      if(action==="input"){
        applyInput(room,pid,{dir:input.dir,bomb:!!input.bomb},Date.now());return room;
      }
      if(action==="ready"){player.ready=!!input.ready;return room;}
      throw new Error("UNKNOWN_ACTION");
    });
    if(result.error)return json({error:result.error},409);
    return json({ok:true,room:result.state});
  }catch(e){return json({error:e.message||"SERVER_ERROR"},400);}
};
