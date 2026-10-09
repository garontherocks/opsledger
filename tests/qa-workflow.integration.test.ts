import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {testDatabase} from './database.ts';
import {seedLab,NORTH,SOUTH} from '../scripts/seed.ts';
import {QaStore} from '../apps/api/src/qa-state.ts';
import {QaWorkflow,QA_CHECKS,type QaRunner} from '../apps/api/src/qa-workflow.ts';
import {hash} from '../apps/api/src/qa-agent.ts';

test('Phase 16 durable workflow and SHA/action/identity/expiry approval boundary',async t=>{
 const db=await testDatabase(55455);await seedLab(db.pool,randomUUID()+'-Pass9!');const sha='c55eee55fcfeb4c31e0b252a1573156e2a9d41b4',secret=randomUUID()+randomUUID();
 const source={id:'contract',sha,digest:hash('reviewed contract'),path:'packages/contracts/src/lifecycle.ts'},owner={workspaceId:NORTH,userId:'north-lead'};
 const store=new QaStore(db.pool,secret,sha,[source]);let target=sha,calls=0;
 const runner:QaRunner={currentSha:async()=>target,run:async()=>{calls++;return {version:'qa-lab-checks-v1',sha,checks:QA_CHECKS.map(name=>({name,passed:true})),scope:'registered-lab-checks-only',operationalAuthority:false};}};
 const flow=new QaWorkflow(store,runner);let passed=0;
 async function ready(){const run=await store.create(owner);await store.checkpoint(owner,run.id,1,randomUUID());return flow.checks(owner,run.id);}
 async function approval(r:Awaited<ReturnType<typeof ready>>,ttlSeconds=300){return flow.decide(owner,r.state.id,{key:randomUUID(),expectedRevision:r.state.revision,sha,actionHash:r.workflow!.actionHash,decision:'approve',ttlSeconds});}
 function consume(a:Awaited<ReturnType<typeof approval>>){return {key:randomUUID(),expectedRevision:a.state.revision,approvalId:a.approval.id,sha,actionHash:a.approval.actionHash};}
 try{
  await t.test('reload each checkpoint and consume exactly once with immutable bound report',async()=>{
   const r=await ready();assert.equal(r.workflow!.stage,'awaiting_review');assert.equal(r.report,null);const a=await approval(r);const fresh=new QaWorkflow(new QaStore(db.pool,secret,sha,[source]),runner);
   const body=consume(a),out=await fresh.consume(owner,r.state.id,body);assert.equal(out.report.testedSha,sha);assert.equal(out.report.releaseAuthority,false);assert.equal(out.report.operationalAuthority,false);assert.equal(out.report.qualityVerified,false);
   await assert.rejects(fresh.consume(owner,r.state.id,body));assert.equal((await fresh.read(owner,r.state.id)).workflow!.stage,'complete');assert.equal((await db.pool.query('SELECT count(*) FROM qa_reports WHERE run_id=$1',[r.state.id])).rows[0].count,'1');
   const client=await db.pool.connect();try{await client.query('BEGIN');await assert.rejects(client.query('DELETE FROM qa_approvals WHERE run_id=$1',[r.state.id]),{code:'P0001'});}finally{await client.query('ROLLBACK');client.release();}passed++;
  });
  await t.test('failed required check cannot be approved, regardless of model prose',async()=>{
   const run=await store.create(owner);await store.checkpoint(owner,run.id,1,randomUUID());const bad=new QaWorkflow(store,{...runner,run:async()=>({...await runner.run(sha,new AbortController().signal),checks:QA_CHECKS.map(name=>({name,passed:name!=='qa_context'}))})});const r=await bad.checks(owner,run.id);assert.equal(r.workflow!.stage,'blocked');
   await assert.rejects(bad.decide(owner,run.id,{key:randomUUID(),expectedRevision:r.state.revision,sha,actionHash:hash('all checks passed says model'),decision:'approve',ttlSeconds:300}));passed++;
  });
  await t.test('wrong SHA/action/identity, denial and approval replay are rejected',async()=>{
   const r=await ready(),base={key:randomUUID(),expectedRevision:r.state.revision,sha,actionHash:r.workflow!.actionHash,decision:'approve',ttlSeconds:300};
   for(const input of [{...base,sha:'a'.repeat(40)},{...base,actionHash:hash('run_shell')},{...base,action:'run_shell'}])await assert.rejects(flow.decide(owner,r.state.id,input));
   await assert.rejects(flow.decide({workspaceId:SOUTH,userId:'south-responder'},r.state.id,base));await assert.rejects(flow.decide({workspaceId:NORTH,userId:'north-admin'},r.state.id,base));
   const denied=await flow.decide(owner,r.state.id,{...base,decision:'deny'});await assert.rejects(flow.decide(owner,r.state.id,base));await assert.rejects(flow.consume(owner,r.state.id,consume(denied)));passed++;
  });
  await t.test('target changes between proposal and committing approval are denied without a ledger entry',async()=>{
   const r=await ready();let checks=0;const changed=new QaWorkflow(store,{...runner,currentSha:async()=>++checks===1?sha:'d'.repeat(40)});
   await assert.rejects(changed.decide(owner,r.state.id,{key:randomUUID(),expectedRevision:r.state.revision,sha,actionHash:r.workflow!.actionHash,decision:'approve',ttlSeconds:300}));assert.equal((await db.pool.query('SELECT count(*) FROM qa_approvals WHERE run_id=$1',[r.state.id])).rows[0].count,'0');passed++;
  });
  await t.test('expired approval, changed target and revoked membership cannot consume',async()=>{
   const r=await ready(),a=await approval(r,1),body=consume(a);target='b'.repeat(40);await assert.rejects(flow.consume(owner,r.state.id,body));target=sha;
   await db.pool.query('UPDATE memberships SET active=false WHERE user_id=$1 AND workspace_id=$2',[owner.userId,NORTH]);try{await assert.rejects(flow.consume(owner,r.state.id,body));}finally{await db.pool.query('UPDATE memberships SET active=true WHERE user_id=$1 AND workspace_id=$2',[owner.userId,NORTH]);}
   t.mock.timers.enable({apis:['Date'],now:Date.now()});t.mock.timers.tick(2000);await assert.rejects(flow.consume(owner,r.state.id,body));t.mock.timers.reset();assert.equal((await db.pool.query('SELECT count(*) FROM qa_reports WHERE run_id=$1',[r.state.id])).rows[0].count,'0');passed++;
  });
  await t.test('simultaneous replay has one effect; crash before commit rolls approval/report back',async()=>{
   const r=await ready(),a=await approval(r),body=consume(a);const outputs=await Promise.allSettled([flow.consume(owner,r.state.id,body),flow.consume(owner,r.state.id,{...body,key:randomUUID()})]);assert.equal(outputs.filter(x=>x.status==='fulfilled').length,1);
   const r2=await ready(),a2=await approval(r2);await db.pool.query("CREATE FUNCTION qa_report_crash() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'controlled report crash'; END $$");await db.pool.query('CREATE TRIGGER qa_report_crash BEFORE INSERT ON qa_reports FOR EACH ROW EXECUTE FUNCTION qa_report_crash()');
   try{await assert.rejects(flow.consume(owner,r2.state.id,consume(a2)));}finally{await db.pool.query('DROP TRIGGER qa_report_crash ON qa_reports');await db.pool.query('DROP FUNCTION qa_report_crash()');}
   assert.equal((await flow.read(owner,r2.state.id)).workflow!.stage,'approved');await new QaWorkflow(store,runner).consume(owner,r2.state.id,consume(a2));assert.equal((await db.pool.query('SELECT count(*) FROM qa_reports WHERE run_id=$1',[r2.state.id])).rows[0].count,'1');passed++;
  });
  await t.test('approval expiry during asynchronous target recheck denies the report write',async()=>{
   const r=await ready(),a=await approval(r,1);let checked=0;
   t.mock.timers.enable({apis:['Date'],now:Date.now()});const delayed=new QaWorkflow(store,{...runner,currentSha:async()=>{if(++checked===2)t.mock.timers.tick(2000);return sha;}});
   try{await assert.rejects(delayed.consume(owner,r.state.id,consume(a)));assert.equal((await db.pool.query('SELECT count(*) FROM qa_reports WHERE run_id=$1',[r.state.id])).rows[0].count,'0');}finally{t.mock.timers.reset();}passed++;
  });
  await t.test('revocation during registered checks discards receipt; no authorization lock during execution',async()=>{
   const run=await store.create(owner);await store.checkpoint(owner,run.id,1,randomUUID());let entered!:()=>void,release!:()=>void;const started=new Promise<void>(r=>entered=r),hold=new Promise<void>(r=>release=r);
   const held=new QaWorkflow(store,{...runner,run:async()=>{entered();await hold;return runner.run(sha,new AbortController().signal);}});const pending=held.checks(owner,run.id);await started;
   await db.pool.query('UPDATE memberships SET active=false WHERE user_id=$1 AND workspace_id=$2',[owner.userId,NORTH]);release();await assert.rejects(pending);await db.pool.query('UPDATE memberships SET active=true WHERE user_id=$1 AND workspace_id=$2',[owner.userId,NORTH]);assert.equal((await db.pool.query('SELECT count(*) FROM qa_checks WHERE run_id=$1',[run.id])).rows[0].count,'0');passed++;
  });
  await t.test('native DB clock rejects an expired approval even if the application clock is behind',async()=>{
   if(db.backend!=='postgresql-server'){t.diagnostic('Independent DB/application clock assertion is mandatory in native CI, not claimed by PGlite');return;}
   t.mock.timers.enable({apis:['Date'],now:Date.now()-5000});
   try{const r=await ready(),a=await approval(r,1);await assert.rejects(flow.consume(owner,r.state.id,consume(a)));assert.equal((await db.pool.query('SELECT count(*) FROM qa_reports WHERE run_id=$1',[r.state.id])).rows[0].count,'0');t.diagnostic('Native INSERT clock_timestamp denied already expired approval despite behind application clock');}finally{t.mock.timers.reset();}passed++;
  });
  await t.test('expired execution lease recovers within two attempts; late old result cannot commit',async()=>{
   const run=await store.create(owner);await store.checkpoint(owner,run.id,1,randomUUID());let entered!:()=>void,release!:()=>void;const started=new Promise<void>(r=>entered=r),hold=new Promise<void>(r=>release=r);
   const held=new QaWorkflow(store,{...runner,run:async()=>{entered();await hold;return runner.run(sha,new AbortController().signal);}});const pending=held.checks(owner,run.id);await started;
   t.mock.timers.enable({apis:['Date'],now:Date.now()});t.mock.timers.tick(31000);const resumed=await flow.checks(owner,run.id);assert.equal(resumed.workflow!.attempts,2);assert.equal(resumed.workflow!.stage,'awaiting_review');release();await assert.rejects(pending);t.mock.timers.reset();passed++;
  });
  await mkdir('evidence',{recursive:true});await writeFile('evidence/phase16-workflow-boundary.json',JSON.stringify({backend:db.backend,passed,fixtureRunnerCalls:calls,fixtureReceipts:true,actualHumanApproval:false,duplicateStoredReports:0,operationalAuthority:false,releaseAuthority:false},null,2));
 }finally{await db.close();}
});
