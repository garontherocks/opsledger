import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {testDatabase} from './database.ts';
import {seedLab,NORTH,SOUTH} from '../scripts/seed.ts';
import {buildApp} from '../apps/api/src/app.ts';
import {Store} from '../apps/api/src/store.ts';
import {config} from '../apps/api/src/config.ts';
import {QA_CHECKS,type QaRunner} from '../apps/api/src/qa-workflow.ts';
test('QA lab real session, workspace scope, strict proposals and approval lifecycle',async()=>{
 const db=await testDatabase(55457),password=randomUUID()+'-Pass9!',sha='c55eee55fcfeb4c31e0b252a1573156e2a9d41b4';await seedLab(db.pool,password);
 const settings=config({DATABASE_URL:'postgresql://127.0.0.1/opsledger_test',AUTH_SECRET:randomUUID()+randomUUID(),NODE_ENV:'test',LAB_MODE:'true',QA_LAB_ENABLED:'true',QA_TARGET_SHA:sha});
 const runner:QaRunner={currentSha:async()=>sha,run:async()=>({version:'qa-lab-checks-v1',sha,checks:QA_CHECKS.map(name=>({name,passed:true})),scope:'registered-lab-checks-only',operationalAuthority:false})};
 const app=await buildApp(new Store(db.pool,settings.AUTH_SECRET),settings,false,undefined,undefined,undefined,runner);await app.ready();
 const path='/api/v1/workspaces/'+NORTH+'/qa-runs';let cookie='';
 async function post(url:string,payload:Record<string,unknown>){return app.inject({method:'POST',url,headers:{cookie,origin:settings.BASE_URL},payload});}
 try{
  assert.equal((await post(path,{})).statusCode,401);
  const login=await post('/api/auth/sign-in/email',{email:'north-lead@example.test',password});assert.equal(login.statusCode,200);cookie=login.cookies.map(c=>c.name+'='+c.value).join('; ');
  assert.equal((await app.inject({url:'/api/v1/me',headers:{cookie}})).json().features.qaLab,true);
  assert.equal((await post('/api/v1/workspaces/'+SOUTH+'/qa-runs',{})).statusCode,404);assert.equal((await post(path,{command:'run_shell'})).statusCode,400);
  const created=await post(path,{});assert.equal(created.statusCode,200);const id=created.json().id;assert.equal((await post(path+'/'+id+'/checkpoint',{key:randomUUID(),expectedRevision:1})).statusCode,200);
  const checks=await post(path+'/'+id+'/checks',{});assert.equal(checks.statusCode,200,checks.body);const r=checks.json();assert.equal(r.workflow.stage,'awaiting_review');
  assert.equal((await post(path+'/'+id+'/decision',{key:randomUUID(),expectedRevision:r.state.revision,sha,actionHash:r.workflow.actionHash,decision:'approve',ttlSeconds:300,userId:'north-admin'})).statusCode,400);
  const decision=await post(path+'/'+id+'/decision',{key:randomUUID(),expectedRevision:r.state.revision,sha,actionHash:r.workflow.actionHash,decision:'approve',ttlSeconds:300});assert.equal(decision.statusCode,200,decision.body);const a=decision.json();
  const body={key:randomUUID(),expectedRevision:a.state.revision,sha,actionHash:a.approval.actionHash,approvalId:a.approval.id};const report=await post(path+'/'+id+'/report',body);assert.equal(report.statusCode,200,report.body);assert.equal(report.json().report.releaseAuthority,false);assert.equal((await post(path+'/'+id+'/report',body)).statusCode,409);
  await db.pool.query('UPDATE memberships SET active=false WHERE user_id=$1 AND workspace_id=$2',['north-lead',NORTH]);assert.equal((await app.inject({url:path+'/'+id,headers:{cookie}})).statusCode,404);
 }finally{await app.close();await db.close();}
});
