import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Action,type IncidentAction} from '../packages/contracts/src/lifecycle.ts';
import {nextState,type State} from '../apps/api/src/lifecycle.ts';
const states:State[]=['reported','triaged','investigating','resolved','closed'];
const roles=['reporter','responder','lead','editor','admin'];
const inputs:IncidentAction[]=[
 {action:'triage',assigneeId:'worker',expectedRevision:1},{action:'assign',assigneeId:'worker',expectedRevision:1},
 {action:'investigate',expectedRevision:1},{action:'resolve',resolutionSummary:'Fixed the failed worker',expectedRevision:1},
 {action:'close',expectedRevision:1},{action:'reopen',reason:'Failure happened again',expectedRevision:1},{action:'comment',body:'Evidence collected',expectedRevision:1}
];
test('exhaustive state/action/role contract (175 combinations)',()=>{
 const legal:Record<string,string>={'reported:triage':'triaged','triaged:assign':'triaged','investigating:assign':'investigating','triaged:investigate':'investigating','investigating:resolve':'resolved','resolved:close':'closed','resolved:reopen':'investigating','closed:reopen':'investigating'};
 for(const state of states)for(const role of roles)for(const input of inputs){
  const permitted=input.action==='comment'||(['resolve','close','reopen'].includes(input.action)?role==='lead':['responder','lead'].includes(role));
  const expected=input.action==='comment'?state:legal[state+':'+input.action];
  if(permitted&&expected)assert.equal(nextState(state,role,input),expected);
  else assert.throws(()=>nextState(state,role,input),{code:permitted?'invalid_transition':'forbidden_action'});
 }
});
test('action validation rejects privilege fields, missing revision and blank resolution/reopen reason',()=>{
 for(const input of [{action:'resolve',expectedRevision:1},{action:'resolve',expectedRevision:1,resolutionSummary:'   '},{action:'reopen',expectedRevision:1,reason:'tiny'},{action:'comment',body:'hi'},{action:'close',expectedRevision:0},{action:'close',expectedRevision:1,role:'lead'},{action:'close',expectedRevision:1,state:'closed'}])assert.equal(Action.safeParse(input).success,false);
});
