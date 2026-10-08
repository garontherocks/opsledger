import {mkdir,writeFile} from 'node:fs/promises';
import {config} from '../apps/api/src/config.ts';
import {OllamaProvider} from '../apps/api/src/local-model.ts';
import {runAgent} from '../apps/api/src/qa-agent.ts';
import {startQaHttp} from '../apps/api/src/qa-mcp-http.ts';
import {connectOwnedQa} from './qa-mcp-host.ts';
import {labInputs,connectQaHttp,runMcpAgent,prepareProcedure} from './m3-lab.ts';
import {allowLabPort,disallowLabPort} from './m3-egress.ts';
const settings=config(process.env);
if(!settings.AI_ENABLED||!settings.LAB_MODE||settings.NODE_ENV==='production'||!process.env.OLLAMA_EXPECTED_VERSION)throw new Error('Pinned owned nonproduction AI lab required');
allowLabPort(11434);
const pinned=new OllamaProvider({...settings,AI_TIMEOUT_MS:60000});
let providerCalls=0;
const provider={generate:async(...args:Parameters<typeof pinned.generate>)=>{providerCalls++;const result=await pinned.generate(...args);if(result.runtime!==process.env.OLLAMA_EXPECTED_VERSION)throw new Error('Runtime changed');return result;}};
const inputs=await labInputs();
const results=[];
const cleanup:(()=>Promise<void>)[]=[];
try{
 const stdio=await connectOwnedQa();cleanup.push(stdio.close);
 const lab=await startQaHttp(inputs.manifest);cleanup.push(lab.close);
 const http=await connectQaHttp(lab.endpoint,lab.mint({expiresAt:Math.floor(Date.now()/1000)+1800}));cleanup.push(http.close);
 const procedure=await prepareProcedure(stdio.client,inputs.skill,inputs.reference);
 for(let repetition=1;repetition<=3;repetition++){
  const order=['direct','stdio','http'];for(let rotate=1;rotate<repetition;rotate++)order.push(order.shift()!);
  for(const lane of order){const start=performance.now();
   const result=lane==='direct'?await runAgent(inputs.manifest,provider,{deadlineMs:120000},{procedure:procedure.procedure}):(await runMcpAgent(lane==='stdio'?stdio.client:http.client,inputs,provider,120000)).result;
   results.push({repetition,lane,latencyMs:performance.now()-start,...result});
  }
 }
 await mkdir('evidence/desktop-private',{recursive:true});
 await writeFile('evidence/desktop-private/m3-validation.json',JSON.stringify({completed:true,at:new Date().toISOString(),node:process.version,expectedOllamaRuntime:process.env.OLLAMA_EXPECTED_VERSION,configuredModel:settings.OLLAMA_MODEL,configuredDigest:settings.OLLAMA_DIGEST,providerCalls,agentRuns:results.length,source:'actual owned provider attempts; successful generation metadata in proposal traces',automaticQualityAcceptance:false,limitations:['consumed fixed task, not fresh held-out generalization','three repetitions per lane, no calibrated semantic pass rate','no product value or model/prompt promotion claim','transport timings include local protocol overhead; no statistical significance claim'],results},null,2)+'\n');
 console.log(JSON.stringify({completed:true,agentRuns:results.length,providerCalls,drafts:results.filter(r=>r.status==='draft').length,blocked:results.filter(r=>r.status==='blocked').length,providerErrors:results.filter(r=>r.reason==='provider_error').length,evidence:'evidence/desktop-private/m3-validation.json',automaticQualityAcceptance:false}));
}finally{for(const close of cleanup.reverse()){try{await close();}catch{console.error('M3 local resource cleanup failed');}}disallowLabPort(11434);}
