import {spawn} from 'node:child_process';
const password=crypto.randomUUID()+'-Pass9!';
for(const flow of ['incident','knowledge','lifecycle','async']){
  const code=await new Promise<number>((resolve,reject)=>{
    const child=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test',`tests/browser/${flow}.spec.ts`],{stdio:'inherit',env:{...process.env,E2E_PASSWORD:password}});
    child.once('error',reject);child.once('exit',code=>resolve(code??1));
  });
  if(code!==0){process.exitCode=code;break;}
}
if(!process.exitCode)console.log('Browser acceptance: all 4 flows passed with separate server lifetimes.');
