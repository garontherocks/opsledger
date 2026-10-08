import {SummaryContent,RiskProposal,type SummaryContentDTO} from '../../../packages/contracts/src/assistance.ts';
import {HttpError} from './errors.ts';
// Defense in depth for unsupported markup/active URL content. React still renders plain text.
export function unsafeText(text:string){return /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]|<\/?[a-z][^>]*>|(?:javascript|data|vbscript)\s*:/i.test(text);}
function parse(raw:string,truncated:boolean){
 if(truncated)throw new HttpError(503,'model_truncated','Incomplete local draft');
 if(raw.length>8000)throw new HttpError(503,'model_output_budget','Local draft too large');
 if(unsafeText(raw))throw new HttpError(503,'model_unsafe','Unsupported local content');
 let parsed:unknown;try{parsed=JSON.parse(raw) as unknown;}catch{throw new HttpError(503,'model_invalid_json','Invalid local JSON');}
 const pending:unknown[]=[parsed];
 while(pending.length){const value=pending.pop();if(typeof value==='string'&&unsafeText(value))throw new HttpError(503,'model_unsafe','Unsupported local content');if(Array.isArray(value))pending.push(...value);else if(value!==null&&typeof value==='object')pending.push(...Object.values(value));}
 return parsed;
}
export function validateSummary(raw:string,context:{state:string,eventIds:string[]},truncated=false){
 const parsed=SummaryContent.safeParse(parse(raw,truncated));
 if(!parsed.success)throw new HttpError(503,'model_schema_invalid','Invalid local contract');
 const content=parsed.data;
 if(content.state!==context.state||content.timeline.some(item=>!context.eventIds.includes(item.eventId))||new Set(content.timeline.map(item=>item.eventId)).size!==content.timeline.length)throw new HttpError(503,'model_grounding_invalid','Invalid local state or citation');
 if(content.status!=='draft'&&content.timeline.length)throw new HttpError(503,'model_schema_invalid','Invalid refusal contract');
 return content;
}
export function validateRisk(raw:string,truncated=false){
 const parsed=RiskProposal.safeParse(parse(raw,truncated));
 if(!parsed.success)throw new HttpError(503,'model_schema_invalid','Invalid local risk contract');
 if(parsed.data.status!=='draft'&&(parsed.data.hypotheses.length||parsed.data.proposedTests.length))throw new HttpError(503,'model_schema_invalid','Invalid refusal contract');
 return parsed.data;
}
export function summaryText(content:SummaryContentDTO){const text=[content.summary,...content.timeline.map(item=>item.observation+' ['+item.eventId+']'),...content.unknowns.map(item=>'Unknown: '+item)].join('\n');if(text.length>8000)throw new HttpError(503,'model_output_budget','Local draft too large');return text;}
