import {test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {testDatabase} from './database.ts';
import {seedLab,NORTH,SOUTH,NORTH_SERVICE} from '../scripts/seed.ts';
import {Store} from '../apps/api/src/store.ts';
import {buildApp} from '../apps/api/src/app.ts';
import {config} from '../apps/api/src/config.ts';
test('Phase 2 lifecycle, permission, rollback and concurrent-write acceptance',async t=>{
 const db=await testDatabase(55435),password=process.env.TEST_PASSWORD??crypto.randomUUID()+'-Pass9!';
 await seedLab(db.pool,password);
 const settings=config({DATABASE_URL:'postgresql://localhost/opsledger_test',AUTH_SECRET:crypto.randomUUID()+crypto.randomUUID(),BASE_URL:'http://localhost:3100',NODE_ENV:'test'});
 const store=new Store(db.pool,settings.AUTH_SECRET),app=await buildApp(store,settings);await app.ready();
 const cookies:Record<string,string>={};let peer=1;
 async function login(user:string){
  const response=await app.inject({method:'POST',url:'/api/auth/sign-in/email',remoteAddress:'127.0.0.'+peer++,headers:{origin:settings.BASE_URL},payload:{email:user+'@example.test',password}});
  assert.equal(response.statusCode,200);cookies[user]=response.cookies.map(c=>c.name+'='+c.value).join('; ');
 }
 async function create(){
  return store.create('north-reporter',NORTH,{title:'Lifecycle '+crypto.randomUUID(),description:'A synthetic worker failure needs investigation',serviceId:NORTH_SERVICE,severity:'high'});
 }
 async function act(id:string,user:string,payload:Record<string,unknown>,workspace=NORTH){
  return app.inject({method:'POST',url:'/api/v1/workspaces/'+workspace+'/incidents/'+id+'/actions',headers:{cookie:cookies[user]!,origin:settings.BASE_URL},payload});
 }
 try{
  t.diagnostic('Backend '+db.backend+'; server_version '+(await db.pool.query('show server_version')).rows[0].server_version);
  for(const user of ['north-reporter','north-responder','north-lead','north-editor','north-admin','south-reporter','revoked-reporter'])await login(user);
  await t.test('complete lifecycle, reassignment, comments and bounded history',async()=>{
   let incident=await create();
   const steps=[
    ['north-responder',{action:'triage',assigneeId:'north-responder'}],
    ['north-lead',{action:'assign',assigneeId:'north-lead'}],
    ['north-responder',{action:'investigate'}],
    ['north-reporter',{action:'comment',body:'Observed a repeated timeout'}],
    ['north-lead',{action:'resolve',resolutionSummary:'Restarted the worker and verified recovery'}],
    ['north-lead',{action:'close'}],
    ['north-lead',{action:'reopen',reason:'The timeout recurred after verification'}]
   ] as const;
   for(const [user,input] of steps){
    const r=await act(incident.id,user,{...input,expectedRevision:incident.revision});assert.equal(r.statusCode,200,r.body);incident=r.json();
   }
   assert.equal(incident.state,'investigating');assert.equal(incident.revision,8);assert.equal(incident.resolutionSummary,null);
   const activity=await store.history(NORTH,incident.id,3);assert.deepEqual(activity.items.map(x=>x.revision),[8,7,6]);
   const next=await store.history(NORTH,incident.id,3,activity.nextBeforeRevision!);assert.deepEqual(next.items.map(x=>x.revision),[5,4,3]);
   const comments=await db.pool.query('SELECT body FROM incident_comments WHERE incident_id=$1',[incident.id]);assert.equal(comments.rows[0].body,'Observed a repeated timeout');
   assert.equal((await store.detail(NORTH,incident.id)).revision,8);
  });
  await t.test('reporter/editor/admin cannot triage; responders cannot resolve; scope checked',async()=>{
   const i=await create();
   for(const user of ['north-reporter','north-editor','north-admin'])assert.equal((await act(i.id,user,{action:'triage',assigneeId:'north-responder',expectedRevision:1})).statusCode,403);
   for(const [user,workspace] of [['south-reporter',NORTH],['revoked-reporter',NORTH],['north-lead',SOUTH]] as const)assert.equal((await act(i.id,user,{action:'comment',body:'Guess',expectedRevision:1},workspace)).statusCode,404);
   assert.equal((await act(i.id,'north-responder',{action:'resolve',resolutionSummary:'Valid resolution text',expectedRevision:1})).statusCode,403);
   assert.equal((await app.inject({url:'/api/v1/workspaces/'+NORTH+'/incidents/'+i.id+'/activity',headers:{cookie:cookies['south-reporter']!}})).statusCode,404);
   assert.equal((await store.detail(NORTH,i.id)).revision,1);
  });
  await t.test('invalid transitions, assignees, resolution/reopen and mass assignment leave no history',async()=>{
   const i=await create();
   for(const assigneeId of ['south-responder','revoked-responder','north-reporter','unknown'])assert.equal((await act(i.id,'north-lead',{action:'triage',assigneeId,expectedRevision:1})).statusCode,404);
   assert.equal((await act(i.id,'north-lead',{action:'close',expectedRevision:1})).statusCode,409);
   for(const payload of [{action:'resolve',expectedRevision:1},{action:'reopen',expectedRevision:1,reason:'   '},{action:'triage',expectedRevision:1,assigneeId:'north-responder',reporterId:'evil'},{action:'comment',body:'Missing revision'}])assert.equal((await act(i.id,'north-lead',payload)).statusCode,400);
   assert.equal((await store.history(NORTH,i.id,50)).items.length,0);
   assert.equal((await store.detail(NORTH,i.id)).revision,1);
  });
  await t.test('stale comments cannot overwrite a successful action',async()=>{
   const i=await create();
   assert.equal((await act(i.id,'north-responder',{action:'triage',assigneeId:'north-responder',expectedRevision:1})).statusCode,200);
   const stale=await act(i.id,'north-reporter',{action:'comment',body:'Stale comment',expectedRevision:1});
   assert.equal(stale.statusCode,409);assert.equal(stale.json().error.code,'revision_conflict');
   assert.equal((await db.pool.query('SELECT count(*) FROM incident_comments WHERE incident_id=$1',[i.id])).rows[0].count,'0');
  });
  await t.test('revoked assignee can be replaced atomically when reopening',async()=>{
   const i=await create();
   for(const [revision,payload] of [[1,{action:'triage',assigneeId:'north-responder'}],[2,{action:'investigate'}],[3,{action:'resolve',resolutionSummary:'Recovery verified before assignment revocation'}]] as const)assert.equal((await act(i.id,'north-lead',{...payload,expectedRevision:revision})).statusCode,200);
   await db.pool.query('UPDATE memberships SET active=false WHERE user_id=$1 AND workspace_id=$2',['north-responder',NORTH]);
   try{
    assert.equal((await act(i.id,'north-lead',{action:'close',expectedRevision:4})).statusCode,200);
    assert.equal((await act(i.id,'north-lead',{action:'reopen',reason:'Failure returned after recovery',expectedRevision:5})).statusCode,404);
    const reopened=await act(i.id,'north-lead',{action:'reopen',reason:'Failure returned after recovery',assigneeId:'north-lead',expectedRevision:5});
    assert.equal(reopened.statusCode,200);assert.equal(reopened.json().assigneeId,'north-lead');assert.equal(reopened.json().revision,6);
   }finally{await db.pool.query('UPDATE memberships SET active=true WHERE user_id=$1 AND workspace_id=$2',['north-responder',NORTH]);}
  });
  await t.test('failed history insertion rolls back incident and comment',async()=>{
   const i=await create();
   // Test-only SQL trigger; no application fault endpoint.
   await db.pool.query("CREATE FUNCTION fail_phase2_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Controlled history failure'; END $$");
   await db.pool.query('CREATE TRIGGER phase2_fail_history BEFORE INSERT ON incident_activity FOR EACH ROW EXECUTE FUNCTION fail_phase2_history()');
   try{
    assert.equal((await act(i.id,'north-reporter',{action:'comment',body:'Must roll back',expectedRevision:1})).statusCode,500);
    assert.equal((await store.detail(NORTH,i.id)).revision,1);
    assert.equal((await store.history(NORTH,i.id,50)).items.length,0);
    assert.equal((await db.pool.query('SELECT count(*) FROM incident_comments WHERE incident_id=$1',[i.id])).rows[0].count,'0');
   }finally{await db.pool.query('DROP TRIGGER phase2_fail_history ON incident_activity');await db.pool.query('DROP FUNCTION fail_phase2_history()');}
  });
  await t.test('DB refuses resolved incident without a resolution',async()=>{
   const i=await create(),client=await db.pool.connect();
   try{await assert.rejects(client.query("UPDATE incidents SET state='resolved',assignee_id='north-responder' WHERE id=$1",[i.id]),{code:'23514'});}finally{client.release();}
  });
  await t.test('failed comment insertion also rolls back the earlier activity insert',async()=>{
   const i=await create();
   await db.pool.query("CREATE FUNCTION fail_phase2_comment() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Controlled comment failure'; END $$");
   await db.pool.query('CREATE TRIGGER phase2_fail_comment BEFORE INSERT ON incident_comments FOR EACH ROW EXECUTE FUNCTION fail_phase2_comment()');
   try{
    assert.equal((await act(i.id,'north-reporter',{action:'comment',body:'No partial history',expectedRevision:1})).statusCode,500);
    assert.equal((await store.detail(NORTH,i.id)).revision,1);assert.equal((await store.history(NORTH,i.id,50)).items.length,0);
   }finally{await db.pool.query('DROP TRIGGER phase2_fail_comment ON incident_comments');await db.pool.query('DROP FUNCTION fail_phase2_comment()');}
  });
  await t.test('simultaneous HTTP actions yield one success and one stale conflict',async()=>{
   const i=await create();
   const responses=await Promise.all([act(i.id,'north-responder',{action:'triage',assigneeId:'north-responder',expectedRevision:1}),act(i.id,'north-lead',{action:'triage',assigneeId:'north-lead',expectedRevision:1})]);
   assert.deepEqual(responses.map(r=>r.statusCode).sort(),[200,409]);assert.equal(responses.find(r=>r.statusCode===409)!.json().error.code,'revision_conflict');
   const final=await store.detail(NORTH,i.id),history=await store.history(NORTH,i.id,50);
   assert.equal(final.revision,2);assert.equal(history.items.length,1);
   await writeFile('evidence/phase2-concurrency.json',JSON.stringify({backend:db.backend,nativeConnections:db.backend==='postgresql-server',statuses:responses.map(r=>r.statusCode),finalRevision:final.revision,activityCount:history.items.length,limitation:db.backend==='pglite-socket'?'HTTP requests overlap; SQL transactions are serialized by a one-client test pool':null},null,2)+'\n');
  });
  await t.test('two native connections compete on the same revision',{skip:db.backend!=='postgresql-server'?'Requires native PostgreSQL connections':false},async()=>{
   const i=await create();
   const blocker=await db.pool.connect();await blocker.query('BEGIN');await blocker.query('SELECT id FROM incidents WHERE id=$1 FOR UPDATE',[i.id]);
   const pending=Promise.allSettled([
    store.act('north-responder',NORTH,i.id,{action:'triage',assigneeId:'north-responder',expectedRevision:1}),
    store.act('north-lead',NORTH,i.id,{action:'triage',assigneeId:'north-lead',expectedRevision:1})
   ]);
   let waitingPids:number[]=[];
   try{
    for(let attempt=0;attempt<250;attempt++){
     const waiting=await db.pool.query("SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query=$1",['SELECT * FROM incidents WHERE workspace_id=$1 AND id=$2 FOR NO KEY UPDATE']);
     waitingPids=waiting.rows.map(row=>row.pid as number);if(waitingPids.length===2)break;
     await new Promise(resolve=>setTimeout(resolve,20));
    }
   }finally{await blocker.query('COMMIT');blocker.release();}
   const outcomes=await pending;assert.equal(new Set(waitingPids).size,2,'Two independent backends must be waiting on the controlled row lock');
   assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
   const rejected=outcomes.find(x=>x.status==='rejected');assert.ok(rejected&&rejected.reason.code==='revision_conflict');
   assert.equal((await store.detail(NORTH,i.id)).revision,2);assert.equal((await store.history(NORTH,i.id,50)).items.length,1);
   await writeFile('evidence/phase2-native-concurrency.json',JSON.stringify({backend:db.backend,serverVersion:(await db.pool.query('SHOW server_version')).rows[0].server_version,waitingPids,outcomes:['committed','revision_conflict'],finalRevision:2,activityCount:1},null,2)+'\n');
  });
 }finally{await app.close();await db.close();}
});

