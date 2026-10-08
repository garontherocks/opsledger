import {test} from 'node:test';
import assert from 'node:assert/strict';
import {testDatabase} from './database.ts';
import {seedLab,NORTH,SOUTH,NORTH_SERVICE} from '../scripts/seed.ts';
import {config} from '../apps/api/src/config.ts';
import {Store,HttpError} from '../apps/api/src/store.ts';
import {buildApp} from '../apps/api/src/app.ts';
import type {TextProvider,Generation} from '../apps/api/src/local-model.ts';
import {writeFile} from 'node:fs/promises';
const generation:Generation={text:'<script>untrusted()</script> Synthetic summary; cause unknown.',model:'fixture-only',digest:'sha256:'+'a'.repeat(64),runtime:'test-double',promptTokens:20,outputTokens:10,latencyMs:1,truncated:false};
test('Phase 6 scoped draft and provider failure acceptance (deterministic provider fixture)',async t=>{
 const db=await testDatabase(55442);await seedLab(db.pool,process.env.TEST_PASSWORD!);
 const settings=config({NODE_ENV:'test',DATABASE_URL:'postgresql://localhost/test',AUTH_SECRET:crypto.randomUUID()+crypto.randomUUID(),LAB_MODE:'true',AI_ENABLED:'true',OLLAMA_MODEL:'qwen3:0.6b-q4_K_M',OLLAMA_DIGEST:generation.digest});
 const store=new Store(db.pool,settings.AUTH_SECRET);let calls=0,prompt='',effect=async()=>generation;
 const provider:TextProvider={generate:async input=>{calls++;prompt=input;return effect();}};
 const app=await buildApp(store,settings,false,undefined,provider);await app.ready();let peer=1;
 const incident=await store.create('north-reporter',NORTH,{title:'Synthetic assistance scope incident',description:'Synthetic evidence for read-only assistance',severity:'low',serviceId:NORTH_SERVICE});
 await store.act('north-reporter',NORTH,incident.id,{action:'comment',body:'password=synthetic-canary '+settings.AUTH_SECRET,expectedRevision:1});let revision=2;
 const signIn=await app.inject({method:'POST',url:'/api/auth/sign-in/email',payload:{email:'north-reporter@example.test',password:process.env.TEST_PASSWORD}});assert.equal(signIn.statusCode,200);
 const headers={origin:settings.BASE_URL,cookie:signIn.cookies.map(c=>c.name+'='+c.value).join('; ')},base='/api/v1/workspaces/'+NORTH;
 const request=(workspace=NORTH,expectedRevision=revision)=>app.inject({method:'POST',url:'/api/v1/workspaces/'+workspace+'/incidents/'+incident.id+'/summary',headers,remoteAddress:'127.0.1.'+peer++,payload:{expectedRevision}});
 try{
  await t.test('draft is revision-bound, metadata-only observability and does not change incident',async()=>{const before=(await db.pool.query('SELECT count(*) FROM audit_events')).rows[0].count;const result=await request();assert.equal(result.statusCode,200,result.body);assert.equal(result.json().reviewRequired,true);assert.equal(result.json().text,generation.text);assert.ok(!prompt.includes(settings.AUTH_SECRET)&&!prompt.includes('synthetic-canary'));assert.equal(result.json().eventIds.length,1);assert.equal((await store.detail(NORTH,incident.id)).revision,revision);assert.equal((await db.pool.query('SELECT count(*) FROM audit_events')).rows[0].count,before);});
  await t.test('cross-workspace and stale requests make no provider call',async()=>{const before=calls;assert.equal((await request(SOUTH)).statusCode,404);assert.equal((await request(NORTH,1)).statusCode,409);assert.equal(calls,before);});
  await t.test('provider outage preserves deterministic reads and recovers',async()=>{effect=async()=>{throw new HttpError(503,'model_timeout','synthetic provider timeout');};const response=await request();assert.equal(response.statusCode,503);assert.ok(!response.body.includes('synthetic provider'));assert.equal((await app.inject({url:base+'/incidents',headers})).statusCode,200);effect=async()=>generation;assert.equal((await request()).statusCode,200);});
  await t.test('revocation during inference suppresses returned draft',async()=>{effect=async()=>{await db.pool.query("UPDATE memberships SET active=false WHERE user_id='north-reporter' AND workspace_id=$1",[NORTH]);return generation;};try{assert.equal((await request()).statusCode,404);}finally{await db.pool.query("UPDATE memberships SET active=true WHERE user_id='north-reporter' AND workspace_id=$1",[NORTH]);effect=async()=>generation;}});
  await t.test('revision change during inference rejects stale output',async()=>{effect=async()=>{await store.act('north-reporter',NORTH,incident.id,{action:'comment',body:'Concurrent evidence changes the snapshot',expectedRevision:revision});return generation;};assert.equal((await request()).statusCode,409);revision++;effect=async()=>generation;});
  await t.test('one inference at a time; busy rejection has no hidden queue',async()=>{let entered!:()=>void,release!:()=>void;const ready=new Promise<void>(resolve=>entered=resolve),blocked=new Promise<void>(resolve=>release=resolve);effect=async()=>{entered();await blocked;return generation;};const first=request();await ready;try{const second=await request();assert.equal(second.statusCode,503);assert.equal(second.json().error.code,'ai_busy');}finally{release();await first;effect=async()=>generation;}});
  await t.test('AI disabled rejects compute and preserves v1',async()=>{const off=await buildApp(store,{...settings,AI_ENABLED:'false'},false,undefined,provider);try{const before=calls;assert.equal((await off.inject({method:'POST',url:base+'/incidents/'+incident.id+'/summary',headers,payload:{expectedRevision:revision}})).statusCode,503);assert.equal((await off.inject({url:'/api/v1/me',headers})).json().features.ai,false);assert.equal((await off.inject({url:base+'/incidents',headers})).statusCode,200);assert.equal(calls,before);}finally{await off.close();}});
  await writeFile('evidence/phase6-boundaries.json',JSON.stringify({backend:db.backend,provider:'explicit deterministic fixture, not live inference',checks:['no incident/audit mutation','credential redaction','scope/stale denial before provider','timeout/outage recovery','revocation and stale snapshot after provider','single-request capacity','AI disabled preserves v1'],modelCalls:calls,rawPromptOrCookiesLogged:false},null,2));
 }finally{await app.close();await db.close();}
});
