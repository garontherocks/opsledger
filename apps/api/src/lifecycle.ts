import type {IncidentAction} from '../../../packages/contracts/src/lifecycle.ts';
import {HttpError} from './errors.ts';
export type State='reported'|'triaged'|'investigating'|'resolved'|'closed';
export function nextState(state:State,role:string,action:IncidentAction):State{
 const operational=['responder','lead'].includes(role);
 const lead=role==='lead';
 if(action.action==='comment')return state;
 if(['resolve','close','reopen'].includes(action.action)?!lead:!operational)throw new HttpError(403,'forbidden_action','Action not permitted');
 switch(action.action){
  case 'triage':if(state==='reported')return 'triaged';break;
  case 'assign':if(['triaged','investigating'].includes(state))return state;break;
  case 'investigate':if(state==='triaged')return 'investigating';break;
  case 'resolve':if(state==='investigating')return 'resolved';break;
  case 'close':if(state==='resolved')return 'closed';break;
  case 'reopen':if(['resolved','closed'].includes(state))return 'investigating';break;
 }
 throw new HttpError(409,'invalid_transition','Action is not valid for the current state');
}
