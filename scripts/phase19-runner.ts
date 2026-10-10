import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {fixedQaRunner} from './qa-fixed-runner.ts';
import {hash} from '../apps/api/src/qa-agent.ts';
import type {PipelineRunner} from '../apps/api/src/qa-pipeline.ts';
const exec=promisify(execFile),root=fileURLToPath(new URL('../',import.meta.url));
const registry={lifecycle_overlap:['tests/lifecycle-outbox.integration.test.ts'],orchestration_boundary:['tests/qa-orchestration.integration.test.ts'],specialist_boundary:['tests/qa-specialists.unit.test.ts']} as const;
export const phase19Runner:PipelineRunner={...fixedQaRunner,async additional(suite,sha,signal){
 if(!Object.hasOwn(registry,suite)||await fixedQaRunner.currentSha()!==sha)throw new Error('unregistered_or_stale_suite');
 let passed=false,output='';try{const r=await exec(process.execPath,['--experimental-strip-types','--test',...registry[suite]],{cwd:root,signal,timeout:30000,maxBuffer:262144,env:{...process.env,LANGCHAIN_TRACING_V2:'false',LANGSMITH_TRACING:'false'}});passed=true;output=r.stdout;}catch(e){if(signal.aborted)throw new Error('pipeline_cancelled');output=e instanceof Error?e.message:'registered_test_failure';}
 if(await fixedQaRunner.currentSha()!==sha)throw new Error('checkout_changed');return {sha,suite,passed,outputHash:hash(output)};
}};
