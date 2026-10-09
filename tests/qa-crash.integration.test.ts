import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
import {testDatabase} from './database.ts';
import {seedLab,NORTH} from '../scripts/seed.ts';
import {QaStore} from '../apps/api/src/qa-state.ts';
import {QaWorkflow,QA_CHECKS,type QaRunner} from '../apps/api/src/qa-workflow.ts';
import {hash} from '../apps/api/src/qa-agent.ts';
test('native abrupt child termination at every durable QA boundary',{skip:!process.env.TEST_DATABASE_URL,timeout:30000},async t=>{
 const db=await testDatabase(55456);await seedLab(db.pool,randomUUID()+'-Pass9!');const sha='c55eee55fcfeb4c31e0b252a1573156e2a9d41b4',secret=randomUUID()+randomUUID(),owner={workspaceId:NORTH,userId:'north-lead'},source={id:'contract',sha,digest:hash('reviewed contract'),path:'packages/contracts/src/lifecycle.ts'};
 const store=new QaStore(db.pool,secret,sha,[source]);const runner:QaRunner={currentSha:async()=>sha,run:async()=>({version:'qa-lab-checks-v1',sha,checks:QA_CHECKS.map(name=>({name,passed:true})),scope:'registered-lab-checks-only',operationalAuthority:false})};const results=[];
 try{
  for(const mode of ['context','claim','receipt','approval','report','after_report']){
   const state=await store.create(owner),flow=new QaWorkflow(store,runner);
   if(mode!=='context')await store.checkpoint(owner,state.id,1,randomUUID());
   if(['approval','report','after_report'].includes(mode)){const r=await flow.checks(owner,state.id);if(mode!=='approval')await flow.decide(owner,state.id,{key:randomUUID(),expectedRevision:r.state.revision,sha,actionHash:r.workflow!.actionHash,decision:'approve',ttlSeconds:300});}
   await assert.rejects(promisify(execFile)(process.execPath,['--experimental-strip-types',fileURLToPath(new URL('../scripts/qa-crash-probe.ts',import.meta.url))],{env:{...process.env,QA_PROBE_DATABASE:db.pool.options.connectionString!,QA_PROBE_SECRET:secret,QA_PROBE_SHA:sha,QA_PROBE_WORKSPACE:NORTH,QA_PROBE_USER:owner.userId,QA_PROBE_ID:state.id,QA_PROBE_MODE:mode},timeout:10000,maxBuffer:4096}),error=>(error as {signal?:string}).signal==='SIGKILL');
   // A fresh controller loads the actual committed state after child death.
   const fresh=new QaWorkflow(new QaStore(db.pool,secret,sha,[source]),runner);let r=await fresh.read(owner,state.id);
   if(mode==='context'){assert.equal(r.state.status,'created');await store.checkpoint(owner,state.id,1,randomUUID());}
   if(mode==='receipt'){assert.equal(r.workflow!.stage,'checks_pending');t.mock.timers.enable({apis:['Date'],now:Date.now()});t.mock.timers.tick(31000);}
   if(['context','claim','receipt'].includes(mode))r=await fresh.checks(owner,state.id);
   if(['context','claim','receipt','approval'].includes(mode)){assert.equal(r.workflow!.stage,'awaiting_review');const a=await fresh.decide(owner,state.id,{key:randomUUID(),expectedRevision:r.state.revision,sha,actionHash:r.workflow!.actionHash,decision:'approve',ttlSeconds:300});r=await fresh.read(owner,a.state.id);}
   const body={key:randomUUID(),expectedRevision:r.state.revision,sha,actionHash:r.workflow!.actionHash,approvalId:r.workflow!.approvalId};
   if(mode==='after_report'){assert.equal(r.workflow!.stage,'complete');await assert.rejects(fresh.consume(owner,state.id,body));}else await fresh.consume(owner,state.id,body);
   assert.equal((await db.pool.query('SELECT count(*) FROM qa_reports WHERE run_id=$1',[state.id])).rows[0].count,'1');results.push({mode,terminated:'SIGKILL',recovered:true,reports:1});t.mock.timers.reset();
  }
  await mkdir('evidence',{recursive:true});await writeFile('evidence/phase16-crash-recovery.json',JSON.stringify({backend:db.backend,results,fixtureReceipts:true,actualHumanApproval:false,operationalAuthority:false},null,2));console.log('QA_CRASH_RECOVERY '+JSON.stringify(results));
 }finally{t.mock.timers.reset();await db.close();}
});
