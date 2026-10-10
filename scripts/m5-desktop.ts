import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {fixedQaRunner} from './qa-fixed-runner.ts';
const exec=promisify(execFile),root=fileURLToPath(new URL('../',import.meta.url));
if(process.env.M5_BUNDLE_FIXTURE==='true')throw new Error('M5 desktop bundle requires the actual approved local model');
const sha=await fixedQaRunner.currentSha();await exec('git',['diff','--quiet','HEAD'],{cwd:root,timeout:5000,maxBuffer:1024});
await mkdir('evidence/desktop-private',{recursive:true});let completed=false;
try{
 await exec(process.execPath,['--env-file=.env','--import',new URL('./m3-egress.ts',import.meta.url).href,'--experimental-strip-types','scripts/phase18-comparison.ts'],{cwd:root,timeout:1800000,maxBuffer:131072,env:{...process.env,QA_TARGET_SHA:sha}});
 if(await fixedQaRunner.currentSha()!==sha)throw new Error('Desktop checkout changed');completed=true;
}finally{await writeFile('evidence/desktop-private/m5-bundle.json',JSON.stringify({version:'m5-desktop-v1',sha,completed,fixture:false,status:completed?'awaiting_human_review':'inconclusive',checks:['actual approved Qwen specialist comparison'],comparison:'m5-specialist-comparison.json',requiredCIIncluded:false,actualHumanReview:false,automaticSemanticAcceptance:false,defaultSpecialistAdoption:false,defaultRetrievalAdoption:false,operationalAuthority:false,releaseAuthority:false,limitations:['No M4 rerun or retuning','No inference from fixture semantic labels','No merge/release authority','Human semantic/security/teach-back checkpoint still required']},null,2)+'\n');}
console.log(JSON.stringify({completed,fixture:false,sha,status:'awaiting_human_review',evidence:'evidence/desktop-private/m5-bundle.json'}));
