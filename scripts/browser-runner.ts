import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
const results:{flow:string,exitCode:number,stats:Record<string,number>|null}[]=[];
const password=crypto.randomUUID()+'-Pass9!';
for(const flow of ['incident','knowledge','lifecycle','async','quality','flags','assistance','retrieval']){
  const code=await new Promise<number>((resolve,reject)=>{
    const child=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test',`tests/browser/${flow}.spec.ts`],{stdio:'inherit',env:{...process.env,E2E_PASSWORD:password,E2E_FLOW:flow,E2E_EMBEDDING_FIXTURE:flow==='retrieval'?'true':'false',E2E_AI_FIXTURE:flow==='assistance'?'true':'false',READ_ONLY:flow==='flags'?'true':'false',KNOWLEDGE_ENABLED:flow==='flags'?'false':'true',ASYNC_ENABLED:flow==='flags'?'false':'true'}});
    child.once('error',reject);child.once('exit',code=>resolve(code??1));
  });
  let stats:Record<string,number>|null=null;try{stats=JSON.parse(await readFile('.local/browser-'+flow+'.json','utf8')).stats;}catch{/* Missing completed report is a failure. */}
  results.push({flow,exitCode:code,stats});
  if(code!==0||stats?.expected!==1||stats?.unexpected!==0||stats?.skipped!==0||stats?.flaky!==0){process.exitCode=code||1;break;}
}
await writeFile('evidence/phase8-browser-summary.json',JSON.stringify({at:new Date().toISOString(),results,allEightPassed:results.length===8&&!process.exitCode},null,2));
if(!process.exitCode)console.log('Browser acceptance: all 8 flows passed with separate server lifetimes.');
