import {mkdir,writeFile} from 'node:fs/promises';
import {specialistExperiment,type SpecialistContext,type SpecialistResult} from '../apps/api/src/qa-specialists.ts';
import {SPECIALIST_CASES,specialistCaseContext} from './phase18-cases.ts';
import {OllamaProvider,type TextProvider} from '../apps/api/src/local-model.ts';
import {QA_SHA} from '../apps/api/src/qa-state.ts';
import {config} from '../apps/api/src/config.ts';
import {allowLabPort,disallowLabPort} from './m3-egress.ts';
const fixture=process.env.M5_BUNDLE_FIXTURE==='true';
const sha=QA_SHA.parse(process.env.QA_TARGET_SHA??(fixture?'1b5c2fba335d69b7957ba408f8c612d1998fd0d7':undefined));
const settings=config(fixture?{DATABASE_URL:'postgresql://127.0.0.1/opsledger_test',AUTH_SECRET:'fixture-only-not-a-deployed-secret-0000',LAB_MODE:'true',AI_ENABLED:'true',OLLAMA_DIGEST:'sha256:'+'a'.repeat(64)}:process.env);
const expectedRuntime=fixture?'fixture':process.env.OLLAMA_EXPECTED_VERSION;
if(settings.NODE_ENV==='production'||settings.LAB_MODE!=='true'||settings.AI_ENABLED!=='true'||!expectedRuntime)throw new Error('Owned pinned nonproduction local model required');
if(!fixture&&(settings.OLLAMA_MODEL!=='qwen3:8b-q4_K_M'||settings.OLLAMA_DIGEST!=='sha256:500a1f067a9f782620b40bee6f7b0c89e17ae61f686b92c24933e4ca4b2b8b41'||expectedRuntime!=='0.34.0'))throw new Error('Approved M5 baseline model/digest/runtime required');
const records:{caseId:string,repetition:number,expected:{status:string,risks:readonly string[]},context:SpecialistContext,result:SpecialistResult,exactRiskLabelMatch:boolean,metrics:{calls:number,promptChars:number,reportedTokens:number,wallLatencyMs:number},semanticQualityVerified:boolean}[]=[];let providerFailures=0;
allowLabPort(11434);
try{
 if(!fixture){const r=await fetch(new URL('/api/version',settings.OLLAMA_URL),{redirect:'error',signal:AbortSignal.timeout(settings.AI_TIMEOUT_MS)});if(!r.ok||(await r.json() as {version:string}).version!==expectedRuntime)throw new Error('Pinned runtime mismatch');}
 for(let repetition=1;repetition<=2;repetition++)for(const c of SPECIALIST_CASES){
  const context=specialistCaseContext(c,sha);
  const provider:TextProvider=fixture?{generate:async()=>({text:JSON.stringify({status:c.status,risks:c.risks,note:'Reviewed fixture only; no live model or semantic acceptance.',operationalAuthority:false}),model:'fixture',digest:'sha256:'+'a'.repeat(64),runtime:'fixture',promptTokens:10,outputTokens:20,latencyMs:0,truncated:false})}:new OllamaProvider(settings);
  const modes=repetition===1?['single','agent_as_tool','handoff'] as const:['handoff','agent_as_tool','single'] as const;
  for(const mode of modes){const result=await specialistExperiment(context,provider,mode);if(result.steps.some(s=>s.runtime!==expectedRuntime)||result.reason==='provider_contract_deadline_or_context')providerFailures++;
   const exactRiskLabelMatch=result.draft?.status===c.status&&JSON.stringify([...(result.draft?.risks??[])].sort())===JSON.stringify([...c.risks].sort());
   records.push({caseId:c.id,repetition,expected:{status:c.status,risks:c.risks},context,result,exactRiskLabelMatch,metrics:{calls:result.calls,promptChars:result.steps.reduce((n,s)=>n+s.promptChars,0),reportedTokens:result.steps.reduce((n,s)=>n+s.promptTokens+s.outputTokens,0),wallLatencyMs:result.latencyMs},semanticQualityVerified:false});
  }
 }
 const aggregate=['single','agent_as_tool','handoff'].map(mode=>{const rows=records.filter(r=>r.result.mode===mode);return {mode,pairs:rows.length,exactSyntheticRiskLabelMatches:rows.filter(r=>r.exactRiskLabelMatch).length,calls:rows.reduce((n,r)=>n+r.metrics.calls,0),promptChars:rows.reduce((n,r)=>n+r.metrics.promptChars,0),reportedTokens:rows.reduce((n,r)=>n+r.metrics.reportedTokens,0),wallLatencyMs:rows.reduce((n,r)=>n+r.metrics.wallLatencyMs,0),conflicts:rows.reduce((n,r)=>n+r.result.conflicts,0)};});
 const path=fixture?'evidence/phase18-comparison-fixture.json':'evidence/desktop-private/m5-specialist-comparison.json';await mkdir(fixture?'evidence':'evidence/desktop-private',{recursive:true});
 const evidence={version:'phase18-comparison-v1',completed:true,fixture,sha,expectedRuntime,providerFailures,aggregate,records,defaultSpecialistAdoption:false,automaticSemanticAcceptance:false,operationalAuthority:false,releaseAuthority:false,limitations:['Known synthetic labels, not held-out/calibrated semantic evaluation','Fixture calls/tokens are controlled protocol proxies, not actual inference cost','Unverified draft/risk agreement is not correctness or product value','Live samples require material human semantic review','Same sources/checks/identity/context hash per pair; mode order reversed on repetition 2','No transport, retrieval, model-pin or approved workflow baseline change']};await writeFile(path,JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({completed:true,fixture,aggregate,providerFailures,evidence:path,automaticSemanticAcceptance:false,defaultSpecialistAdoption:false}));if(providerFailures)process.exitCode=1;
}finally{disallowLabPort(11434);}

