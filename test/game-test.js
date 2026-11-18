
import assert from "node:assert/strict";
import {newGame,tick} from "../lib/game-core.js";
const players=[{id:"p1",name:"ONE",wins:0},{id:"p2",name:"TWO",wins:0}];
let now=1000000,g=newGame(players);
function winRound(winner){
  const before=g.players.find(p=>p.id===winner).wins;
  g.players.forEach(p=>{p.alive=p.id===winner;});
  g.roundEndsAt=now+999999;
  tick(g,now);
  assert.equal(g.players.find(p=>p.id===winner).wins,before+1);
  const completedRound=g.round;
  if(completedRound<3){now+=3000;tick(g,now);assert.equal(g.round,completedRound+1);assert.equal(g.phase,"playing");}
}
winRound("p1");winRound("p2");winRound("p1");
assert.equal(g.phase,"finished");
assert.equal(g.matchWinner,"p1");
assert.equal(g.players.find(p=>p.id==="p1").wins,2);
assert.equal(g.players.find(p=>p.id==="p2").wins,1);
console.log("PASS: 3 rounds, 2 players, round scoring, final winner p1 (2–1)");
