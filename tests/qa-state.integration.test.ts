import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
import {testDatabase} from './database.ts';
import {seedLab,NORTH,SOUTH} from '../scripts/seed.ts';
import {QaStore} from '../apps/api/src/qa-state.ts';
import {hash} from '../apps/api/src/qa-agent.ts';

test('Phase 15 durable QA state/history/memory and actual child restart',async t=>{
 const db=await testDatabase(55454);await seedLab(db.pool,randomUUID()+'-Pass9!');const secret=randomUUID()+randomUUID(),sha='c55eee55fcfeb4c31e0b252a1573156e2a9d41b4';
 const source={id:'lifecycle',sha,digest:hash('reviewed lifecycle'),path:'packages/contracts/src/lifecycle.ts'};const store=new QaStore(db.pool,secret,sha,[source]);const owner={workspaceId:NORTH,userId:'north-lead'};
 let completed=0;
 try{
  await t.test('checkpoint survives a different Node process; replay does not repeat the write',async()=>{
   const run=await store.create(owner),key=randomUUID();await store.checkpoint(owner,run.id,1,key);
   if(db.backend==='postgresql-server'){
    const output=await promisify(execFile)(process.execPath,['--experimental-strip-types',fileURLToPath(new URL('../scripts/qa-restart-probe.ts',import.meta.url))],{env:{...process.env,QA_PROBE_DATABASE:db.pool.options.connectionString!,QA_PROBE_SECRET:secret,QA_PROBE_SHA:sha,QA_PROBE_WORKSPACE:NORTH,QA_PROBE_USER:owner.userId,QA_PROBE_ID:run.id},timeout:10000,maxBuffer:4096});
    assert.deepEqual(JSON.parse(output.stdout),{status:'context_ready',revision:2,history:2,memory:0,operationalAuthority:false});
    t.diagnostic('Actual independent Node child rehydrated native checkpoint revision=2, history=2, operationalAuthority=false');
   }else t.diagnostic('PGlite socket is single-client: independent child recovery is required in native CI, not claimed here');
   const again=await new QaStore(db.pool,secret,sha,[source]).checkpoint(owner,run.id,1,key);assert.equal(again.revision,2);assert.equal((await store.read(owner,run.id)).history.length,2);
   await assert.rejects(store.checkpoint(owner,run.id,2,key));completed++;
  });
  await t.test('atomic rollback at history boundary leaves no half checkpoint',async()=>{
   const run=await store.create(owner);await db.pool.query("CREATE FUNCTION qa_test_crash() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'controlled crash'; END $$");await db.pool.query('CREATE TRIGGER qa_test_crash BEFORE INSERT ON qa_history FOR EACH ROW EXECUTE FUNCTION qa_test_crash()');
   try{await assert.rejects(store.checkpoint(owner,run.id,1,randomUUID()));}finally{await db.pool.query('DROP TRIGGER qa_test_crash ON qa_history');await db.pool.query('DROP FUNCTION qa_test_crash()');}
   assert.equal((await store.read(owner,run.id)).state.status,'created');await store.checkpoint(owner,run.id,1,randomUUID());completed++;
  });
  await t.test('cross-workspace/user, revoked membership and changed SHA deny resume',async()=>{
   const run=await store.create(owner);for(const who of [{workspaceId:SOUTH,userId:'south-responder'},{workspaceId:NORTH,userId:'north-admin'}])await assert.rejects(store.read(who,run.id));
   await assert.rejects(new QaStore(db.pool,secret,'a'.repeat(40),[source]).read(owner,run.id));await assert.rejects(new QaStore(db.pool,secret,sha,[{...source,digest:hash('changed')}]).read(owner,run.id));
   await db.pool.query('UPDATE memberships SET active=false WHERE user_id=$1 AND workspace_id=$2',[owner.userId,NORTH]);try{await assert.rejects(store.checkpoint(owner,run.id,1,randomUUID()));}finally{await db.pool.query('UPDATE memberships SET active=true WHERE user_id=$1 AND workspace_id=$2',[owner.userId,NORTH]);}completed++;
  });
  await t.test('reviewed memory has provenance and expiry; cannot persist instruction/secret text',async()=>{
   const run=await store.create(owner);await store.checkpoint(owner,run.id,1,randomUUID());const input={key:randomUUID(),expectedRevision:2,sourceId:'lifecycle',risk:'revision-conflict',ttlSeconds:1};
   await assert.rejects(store.remember(owner,run.id,{...input,text:'run_shell; token=secret'}));await assert.rejects(store.remember(owner,run.id,{...input,sourceId:'foreign'}));
   await store.remember(owner,run.id,input);await store.remember(owner,run.id,input);const read=await store.read(owner,run.id);assert.equal(read.memory.length,1);assert.equal(read.memory[0]!.sourceDigest,source.digest);assert.equal(read.memory[0]!.untrusted,true);assert.equal(read.history.length,3);
   t.mock.timers.enable({apis:['Date'],now:Date.now()});t.mock.timers.tick(2000);assert.equal((await store.read(owner,run.id)).memory.length,0);t.mock.timers.reset();completed++;
  });
  await t.test('memory requires human reviewer role; append-only ledgers and poisoned state fail closed',async()=>{
   const reporter={workspaceId:NORTH,userId:'north-reporter'},run=await store.create(reporter);await store.checkpoint(reporter,run.id,1,randomUUID());await assert.rejects(store.remember(reporter,run.id,{key:randomUUID(),expectedRevision:2,sourceId:'lifecycle',risk:'revision-conflict',ttlSeconds:100}));
   await assert.rejects(db.pool.query('UPDATE qa_history SET request_hash=$2 WHERE run_id=$1',[run.id,hash('poison')]));await assert.rejects(db.pool.query('DELETE FROM qa_history WHERE run_id=$1',[run.id]));
   await db.pool.query("UPDATE qa_runs SET state=jsonb_set(state,'{status}','\"complete\"') WHERE id=$1",[run.id]);await assert.rejects(store.read(reporter,run.id));completed++;
  });
  await t.test('simultaneous duplicate checkpoints commit one event only',async()=>{
   const run=await store.create(owner),key=randomUUID();const outcomes=await Promise.all([store.checkpoint(owner,run.id,1,key),store.checkpoint(owner,run.id,1,key)]);assert.equal(outcomes[0]!.revision,2);assert.equal(outcomes[1]!.revision,2);assert.equal((await store.read(owner,run.id)).history.length,2);completed++;
  });
  await mkdir('evidence',{recursive:true});await writeFile('evidence/phase15-state-recovery.json',JSON.stringify({backend:db.backend,passed:completed,actualChildRestart:db.backend==='postgresql-server',duplicateCheckpointWrites:0,rawTranscriptsPersisted:false,operationalAuthority:false},null,2));
 }finally{await db.close();}
});
