import {validateSummary,validateRisk} from './structured-output.ts';
export type EvalCase={id:string,split:string,surface:string,context:{state:string,eventIds:string[]},raw:string,truncated:boolean,expectedBoundary:string,oracle:{required:string[],forbidden:string[]}};
export function evaluateCase(item:EvalCase){
 let validated:unknown=null,boundary='accepted-contract';
 try{validated=item.surface==='risk'?validateRisk(item.raw,item.truncated):validateSummary(item.raw,item.context,item.truncated);}catch(error){boundary=(error as {code?:string}).code??'unexpected_error';}
 const text=JSON.stringify(validated);
 const missing=item.oracle.required.filter(value=>!text.includes(value)),unsupported=item.oracle.forbidden.filter(value=>text.includes(value));
 return {caseId:item.id,split:item.split,surface:item.surface,raw:item.raw,validated,boundary,expectedBoundary:item.expectedBoundary,boundaryExpectationMet:boundary===item.expectedBoundary,literalOracle:validated?{passes:!missing.length&&!unsupported.length,missing,unsupported}:null,humanReview:'pending',truthGuarantee:false};
}
