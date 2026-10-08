import {spawn,type ChildProcess} from 'node:child_process';
import {open,closeSync} from 'node:fs';
import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {testDatabase} from '../tests/database.ts';
import {seedLab,NORTH,NORTH_SERVICE} from './seed.ts';
import {config} from '../apps/api/src/config.ts';
import {Store} from '../apps/api/src/store.ts';
import {buildApp} from '../apps/api/src/app.ts';
const executable=resolve('.local/ollama-runtime/bin/ollama'),origin='http://127.0.0.1:11436';
const log=await new Promise<number>((resolve,reject)=>open('.local/phase6-live-api-runtime.log','w',0o600,(error,fd)=>error?reject(error):resolve(fd)));
let server:ChildProcess|undefined;
async function start(){server=spawn(executable,['serve'],{env:{...process.env,OLLAMA_HOST:'127.0.0.1:11436',OLLAMA_NO_CLOUD:'1',OLLAMA_MODELS:resolve('.local/ollama-models'),OLLAMA_NUM_PARALLEL:'1',OLLAMA_MAX_LOADED_MODELS:'1',CUDA_VISIBLE_DEVICES:'-1'},stdio:['ignore',log,log]});for(let n=0;n<50;n++){try{if((await fetch(origin+'/api/version',{signal:AbortSignal.timeout(500)})).ok)return;}catch{/* Waiting for owned runtime. */}await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Owned local runtime failed readiness');}
async function stop(){if(!server)return;const stopped=new Promise<void>(resolve=>server!.once('exit',()=>resolve()));server.kill('SIGTERM');await stopped;server=undefined;}
try{
 await start();const tags=await fetch(origin+'/api/tags').then(response=>response.json()) as {models:{name:string,digest:string}[]};const model=tags.models.find(item=>item.name==='qwen3:0.6b-q4_K_M');assert.ok(model);
 const settings=config({DATABASE_URL:'postgresql://localhost/smoke_test',AUTH_SECRET:crypto.randomUUID()+crypto.randomUUID(),NODE_ENV:'test',LAB_MODE:'true',AI_ENABLED:'true',OLLAMA_URL:origin,OLLAMA_MODEL:'qwen3:0.6b-q4_K_M',OLLAMA_DIGEST:model.digest.startsWith('sha256:')?model.digest:'sha256:'+model.digest,AI_TIMEOUT_MS:'120000'});
 const db=await testDatabase(55444);const password=crypto.randomUUID()+'-Pass9!';await seedLab(db.pool,password);const store=new Store(db.pool,settings.AUTH_SECRET);
 const incident=await store.create('north-reporter',NORTH,{title:'Live CPU summary smoke incident',description:'Fictional worker timeouts, no confirmed cause or resolution',severity:'low',serviceId:NORTH_SERVICE});await store.act('north-reporter',NORTH,incident.id,{action:'comment',expectedRevision:1,body:'Worker timeouts observed; cause and recovery remain unknown.'});
 const app=await buildApp(store,settings);await app.ready();
 try{
  const login=await app.inject({method:'POST',url:'/api/auth/sign-in/email',payload:{email:'north-reporter@example.test',password}});assert.equal(login.statusCode,200);const headers={origin:settings.BASE_URL,cookie:login.cookies.map(c=>c.name+'='+c.value).join('; ')};
  const summary=()=>app.inject({method:'POST',url:'/api/v1/workspaces/'+NORTH+'/incidents/'+incident.id+'/summary',headers,payload:{expectedRevision:2}});
  const first=await summary();assert.equal(first.statusCode,200,first.body);assert.equal(first.json().runtime,'0.34.0');assert.equal(first.json().reviewRequired,true);
  await stop();const unavailable=await summary();assert.equal(unavailable.statusCode,503);assert.equal((await app.inject({url:'/api/v1/workspaces/'+NORTH+'/incidents',headers})).statusCode,200);
  await start();const recovered=await summary();assert.equal(recovered.statusCode,200,recovered.body);assert.equal((await store.detail(NORTH,incident.id)).revision,2);
  await writeFile('evidence/phase6-live-api.json',JSON.stringify({backend:db.backend,runtime:'actual Ollama 0.34.0 CPU-only',firstDraft:first.json(),stoppedProvider:{status:unavailable.statusCode,error:unavailable.json().error},deterministicReadDuringOutage:200,recoveredDraft:recovered.json(),incidentRevisionAfter:2,humanReview:'pending'},null,2));
  console.log('Actual local API generation, stopped-provider outage and recovery passed; no incident revision change.');
 }finally{await app.close();await db.close();}
}finally{await stop();closeSync(log);}
