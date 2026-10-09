import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {QA_CHECKS,QaReceipt,type QaRunner} from '../apps/api/src/qa-workflow.ts';
import {QA_SHA} from '../apps/api/src/qa-state.ts';
// Reviewed fixed executable + argument lists. No shell, model-selected command,
// generated test code, dynamically supplied path, paid provider or release tool.
const exec=promisify(execFile);
const root=fileURLToPath(new URL('../',import.meta.url));
const guard=new URL('./mcp-egress.mjs',import.meta.url).href;
const m3Guard=new URL('./m3-egress.ts',import.meta.url).href;
const tasks=[
 ['--experimental-strip-types','--test','tests/domain.test.ts','tests/lifecycle.domain.test.ts','tests/knowledge.domain.test.ts','tests/async.domain.test.ts','tests/client.unit.test.ts','tests/local-model.unit.test.ts','tests/structured-output.unit.test.ts','tests/embeddings.unit.test.ts','tests/qa-agent.unit.test.ts'],
 ['--import',guard,'--experimental-strip-types','--test','tests/qa-context.unit.test.ts'],
 ['--import',guard,'--experimental-strip-types','--test','tests/qa-mcp.integration.test.ts'],
 ['--import',m3Guard,'--experimental-strip-types','--test','tests/qa-m3.integration.test.ts']
];
export const fixedQaRunner:QaRunner={
 async currentSha(){const head=await exec('git',['rev-parse','HEAD'],{cwd:root,timeout:5000,maxBuffer:1024});await exec('git',['diff','--quiet','HEAD','--','apps','packages','scripts','tests','migrations','package.json','package-lock.json','tsconfig.json'],{cwd:root,timeout:5000,maxBuffer:1024});return QA_SHA.parse(head.stdout.trim());},
 async run(sha,signal){
  if(await this.currentSha()!==sha)throw new Error('qa_checkout_changed');const checks=[];
  // Every registered gate executes; an exit failure is a failed gate, never AI pass.
  for(let i=0;i<tasks.length;i++){
   let passed=false;
   try{await exec(process.execPath,tasks[i]!,{cwd:root,signal,timeout:15000,maxBuffer:262144,env:{...process.env,LANGCHAIN_TRACING_V2:'false',LANGSMITH_TRACING:'false'}});passed=true;}catch{if(signal.aborted)throw new Error('qa_cancelled');}
   checks.push({name:QA_CHECKS[i]!,passed});
  }
  if(await this.currentSha()!==sha)throw new Error('qa_checkout_changed');return QaReceipt.parse({version:'qa-lab-checks-v1',sha,checks,scope:'registered-lab-checks-only',operationalAuthority:false});
 }
};
