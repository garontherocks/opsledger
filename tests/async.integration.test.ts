import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,utimes,readdir,symlink,lstat,lutimes} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {JobWithMetadata} from 'pg-boss';
import {testDatabase} from './database.ts';
import {seedLab,NORTH,SOUTH,NORTH_SERVICE} from '../scripts/seed.ts';
import {Store} from '../apps/api/src/store.ts';
import {AsyncOps,QUEUE} from '../apps/api/src/async-ops.ts';
import {digest,PrivateStorage} from '../apps/api/src/private-storage.ts';
import {buildApp} from '../apps/api/src/app.ts';
import {config} from '../apps/api/src/config.ts';
test('Phase 4 real pg-boss, recovery, file and notification acceptance',async t=>{
 const db=await testDatabase(55439),root=await mkdtemp(join(tmpdir(),'opsledger-async-'));
 const password=process.env.TEST_PASSWORD??crypto.randomUUID()+'-Pass9!';await seedLab(db.pool,password);
 const settings=config({DATABASE_URL:'postgresql://localhost/opsledger_test',AUTH_SECRET:crypto.randomUUID()+crypto.randomUUID(),NODE_ENV:'test'});
 const store=new Store(db.pool,settings.AUTH_SECRET),ops=await new AsyncOps(db.pool,root,db.backend==='pglite-socket'?'pglite':'postgres').start();
 const app=await buildApp(store,settings,false,ops);await app.ready();const cookies:Record<string,string>={};let peer=100;
 const base='/api/v1/workspaces/'+NORTH;const trace:Record<string,unknown>[]=[];
 async function request(user:string,method:'GET'|'POST'|'DELETE',url:string,payload?:Record<string,unknown>){return app.inject({method,url,remoteAddress:'127.0.0.'+peer++,headers:{...(cookies[user]?{cookie:cookies[user]}:{}),origin:settings.BASE_URL},...(payload?{payload}:{})});}
 async function settle(job:JobWithMetadata<{operationId:string}>){
  try{await ops.handle(job);await ops.boss.complete(QUEUE,job);}catch{await ops.boss.fail(QUEUE,job,{code:'effect_failed'});}
  await ops.reconcile();
 }
 async function drain(){for(let n=0;n<100;n++){const jobs=await ops.boss.fetch<{operationId:string}>(QUEUE,{batchSize:10,includeMetadata:true});if(!jobs.length)break;for(const job of jobs)await settle(job);}}
 async function claim(id:string){
  for(let n=0;n<60;n++){
   const jobs=await ops.boss.fetch<{operationId:string}>(QUEUE,{batchSize:50,includeMetadata:true});
   const found=jobs.find(job=>job.data.operationId===id);for(const job of jobs)if(job!==found)await settle(job);
   if(found)return found;await new Promise(resolve=>setTimeout(resolve,100));
  }throw new Error('Job claim timeout');
 }
 try{
  for(const user of ['north-reporter','north-lead','north-responder','south-reporter']){
   const r=await request(user,'POST','/api/auth/sign-in/email',{email:user+'@example.test',password});assert.equal(r.statusCode,200,r.body);cookies[user]=r.cookies.map(c=>c.name+'='+c.value).join('; ');
  }
  const incident=await store.create('north-reporter',NORTH,{title:'Async fictional worker incident',description:'Synthetic timeout incident with private evidence',severity:'low',serviceId:NORTH_SERVICE});
  const incidentBase=base+'/incidents/'+incident.id;
  let exportId='',exportFile='',attachmentId='',attachmentFile='';
  await t.test('atomic enqueue, duplicate request and fixed revision snapshot',async()=>{
   const body={requestKey:'export_'+crypto.randomUUID(),expectedRevision:1};
   const first=await request('north-reporter','POST',incidentBase+'/exports',body);assert.equal(first.statusCode,202,first.body);exportId=first.json().id;exportFile=first.json().fileId;
   const again=await request('north-reporter','POST',incidentBase+'/exports',body);assert.equal(again.statusCode,202);assert.equal(again.json().id,exportId);
   assert.equal((await request('north-reporter','POST',incidentBase+'/exports',{...body,expectedRevision:2})).statusCode,409);
   assert.equal((await request('north-reporter','POST',incidentBase+'/exports',{requestKey:'stale_'+crypto.randomUUID(),expectedRevision:2})).statusCode,409);
   assert.equal((await request('north-reporter','GET',base+'/files/'+exportFile)).statusCode,404);
   await store.act('north-lead',NORTH,incident.id,{action:'triage',assigneeId:'north-responder',expectedRevision:1});
   await settle(await claim(exportId));
   const download=await request('north-reporter','GET',base+'/files/'+exportFile);assert.equal(download.statusCode,200);assert.equal(download.json().incident.revision,1);assert.equal(download.headers['x-content-type-options'],'nosniff');assert.ok(String(download.headers['content-disposition']).startsWith('attachment;'));
   assert.equal((await request('north-lead','GET',base+'/files/'+exportFile)).statusCode,404);
   assert.equal((await request('south-reporter','GET',base+'/files/'+exportFile)).statusCode,404);
   assert.equal((await request('north-reporter','GET','/api/v1/workspaces/'+SOUTH+'/operations/'+exportId)).statusCode,404);
   const op=await request('north-reporter','GET',base+'/operations/'+exportId);assert.equal(op.json().state,'completed');assert.ok(!op.body.includes('payload'));assert.ok(!op.body.includes('base64'));trace.push({scenario:'snapshot/idempotent enqueue',...op.json()});
  });
  await t.test('audit failure rolls back file metadata, operation and real queue job',async()=>{
   const before=(await db.pool.query('SELECT count(*) FROM pgboss.job')).rows[0].count;
   await db.pool.query("CREATE FUNCTION phase4_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='async.export.request' THEN RAISE EXCEPTION 'Controlled enqueue rollback'; END IF; RETURN NEW; END $$");
   await db.pool.query('CREATE TRIGGER phase4_fail BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION phase4_fail_audit()');
   const key='rollback_'+crypto.randomUUID();
   try{const response=await request('north-reporter','POST',incidentBase+'/exports',{requestKey:key,expectedRevision:2});assert.equal(response.statusCode,500);assert.ok(!response.body.includes('Controlled'));assert.equal((await db.pool.query('SELECT count(*) FROM async_operations WHERE request_key=$1',[key])).rows[0].count,'0');assert.equal((await db.pool.query('SELECT count(*) FROM pgboss.job')).rows[0].count,before);}
   finally{await db.pool.query('DROP TRIGGER phase4_fail ON audit_events');await db.pool.query('DROP FUNCTION phase4_fail_audit()');}
  });
  await t.test('strict text attachment validation, member scope and owner deletion',async()=>{
   const body={requestKey:'attachment_'+crypto.randomUUID(),filename:'worker-notes.txt',mime:'text/plain',base64:Buffer.from('<script>synthetic()</script>\nWorker evidence 😀').toString('base64')};
   for(const filename of ['../evil.txt','/etc/passwd','bad.html','bad.txt\r\nX:yes','a\\evil.txt'])assert.equal((await request('north-reporter','POST',incidentBase+'/attachments',{...body,filename})).statusCode,400);
   for(const base64 of [Buffer.from([0xff]).toString('base64'),Buffer.from('a\0b').toString('base64'),Buffer.alloc(16385,65).toString('base64')])assert.equal((await request('north-reporter','POST',incidentBase+'/attachments',{...body,base64})).statusCode,400);
   const r=await request('north-reporter','POST',incidentBase+'/attachments',body);assert.equal(r.statusCode,202,r.body);attachmentId=r.json().id;attachmentFile=r.json().fileId;
   await settle(await claim(attachmentId));const download=await request('north-responder','GET',base+'/files/'+attachmentFile);assert.equal(download.statusCode,200);assert.equal(download.body,Buffer.from(body.base64,'base64').toString());assert.ok(String(download.headers['content-type']).includes('text/plain'));assert.equal((await lstat(join(root,attachmentFile+'.blob'))).mode&0o777,0o600);
   assert.equal((await request('north-responder','DELETE',base+'/files/'+attachmentFile)).statusCode,403);
   assert.equal((await request('south-reporter','GET',base+'/files/'+attachmentFile)).statusCode,404);
   assert.equal((await request('north-responder','GET',base+'/operations/'+attachmentId)).statusCode,404);
  });
  await t.test('failure after filesystem effect retries without duplicate object',async()=>{
   const body={requestKey:'crashfs_'+crypto.randomUUID(),filename:'crash-notes.txt',mime:'text/plain',base64:Buffer.from('Idempotent file effect before database commit').toString('base64')};
   const r=await request('north-reporter','POST',incidentBase+'/attachments',body);const id=r.json().id,file=r.json().fileId;
   const original=ops.storage.put.bind(ops.storage);let fail=true;
   ops.storage.put=async(...args)=>{await original(...args);if(fail){fail=false;throw new Error('Simulated crash after fsync before metadata commit');}};
   try{await settle(await claim(id));assert.ok((await readdir(root)).includes(file+'.blob'));assert.equal((await ops.operation('north-reporter',NORTH,id)).state,'queued');await settle(await claim(id));}
   finally{ops.storage.put=original;}
   const op=await ops.operation('north-reporter',NORTH,id);assert.equal(op.state,'completed');assert.equal(op.attempts,2);assert.equal((await readdir(root)).filter(name=>name===file+'.blob').length,1);trace.push({scenario:'filesystem effect before DB commit',...op});
  });
  await t.test('committed effect before queue acknowledgement survives redelivery and duplicate job',async()=>{
   const r=await request('north-reporter','POST',incidentBase+'/exports',{requestKey:'crashack_'+crypto.randomUUID(),expectedRevision:2});const id=r.json().id;
   const first=await claim(id);await ops.handle(first);assert.equal((await ops.operation('north-reporter',NORTH,id)).state,'completed');
   // Deliberately omit completion, then fail the claimed attempt as a controlled interrupted-ack simulation.
   await ops.boss.fail(QUEUE,first,{code:'simulated_worker_interruption'});await settle(await claim(id));
   await ops.boss.send(QUEUE,{operationId:id});await drain();
   const op=await ops.operation('north-reporter',NORTH,id);assert.equal(op.attempts,1);assert.equal(op.timeline.filter(row=>row.event==='effect_committed').length,1);trace.push({scenario:'committed effect before acknowledgement + duplicate delivery',...op});
  });
  await t.test('retry exhaustion is visible with a bounded real queue attempt count',async()=>{
   const r=await request('north-reporter','POST',incidentBase+'/attachments',{requestKey:'exhaust_'+crypto.randomUUID(),filename:'exhaustion.txt',mime:'text/plain',base64:Buffer.from('Synthetic failure bounded at three attempts').toString('base64')});const id=r.json().id;
   const original=ops.storage.put;ops.storage.put=async()=>{throw new Error('Controlled storage outage');};
   try{for(let n=0;n<3;n++)await settle(await claim(id));}finally{ops.storage.put=original;}
   const op=await ops.operation('north-reporter',NORTH,id);assert.equal(op.state,'failed');assert.equal(op.attempts,3);assert.equal(op.lastError,'retry_exhausted');
   const job=await ops.boss.getJobById(QUEUE,(await db.pool.query('SELECT job_id FROM async_operations WHERE id=$1',[id])).rows[0].job_id);assert.equal(job?.state,'failed');assert.equal(job?.retryCount,2);trace.push({scenario:'retry exhaustion',...op});
   assert.equal((await request('north-lead','POST',base+'/operations/'+id+'/retry',{})).statusCode,404);
   assert.equal((await request('north-reporter','POST',base+'/operations/'+id+'/retry',{})).statusCode,202);await settle(await claim(id));
   const recovered=await ops.operation('north-reporter',NORTH,id);assert.equal(recovered.state,'completed');assert.equal(recovered.attempts,4);
   assert.equal((await request('north-reporter','POST',base+'/operations/'+id+'/retry',{})).statusCode,409);trace.push({scenario:'explicit owner retry after repair',...recovered});
  });
  await t.test('outbox survives worker absence, notifications are recipient scoped and deduplicated',async()=>{
   const events=await db.pool.query('SELECT id FROM domain_outbox WHERE incident_id=$1 ORDER BY revision',[incident.id]);assert.equal(events.rows.length,2);
   await ops.dispatch();await drain();await ops.dispatch();await drain();
   const notices=await ops.notices('north-reporter',NORTH,50);const mine=notices.items.filter(row=>row.incidentId===incident.id);assert.equal(mine.length,2);
   const notifyOp=(await db.pool.query("SELECT id FROM async_operations WHERE incident_id=$1 AND user_id='north-reporter' AND kind='notify' LIMIT 1",[incident.id])).rows[0].id;
   await ops.boss.send(QUEUE,{operationId:notifyOp});await drain();assert.equal((await ops.notices('north-reporter',NORTH,50)).items.filter(row=>row.incidentId===incident.id).length,2);
   const notice=mine[0];assert.equal((await request('north-responder','POST',base+'/notifications/'+notice.id+'/read',{})).statusCode,404);
   assert.equal((await request('north-reporter','POST',base+'/notifications/'+notice.id+'/read',{})).statusCode,200);
   const first=await ops.notices('north-reporter',NORTH,1);assert.ok(first.nextBefore);const next=await ops.notices('north-reporter',NORTH,1,first.nextBefore!);assert.notEqual(first.items[0]!.id,next.items[0].id);
   await assert.rejects(ops.notices('north-responder',NORTH,1,first.items[0]!.id),{code:'invalid_cursor'});
  });
  await t.test('membership revoked before effect cancels work and prevents publication',async()=>{
   const r=await request('north-responder','POST',incidentBase+'/exports',{requestKey:'revoke_'+crypto.randomUUID(),expectedRevision:2});const id=r.json().id;
   await db.pool.query("UPDATE memberships SET active=false WHERE user_id='north-responder' AND workspace_id=$1",[NORTH]);
   try{await settle(await claim(id));assert.equal((await ops.operation('north-responder',NORTH,id)).state,'cancelled');assert.equal((await request('north-responder','GET',base+'/files/'+r.json().fileId)).statusCode,404);}
   finally{await db.pool.query("UPDATE memberships SET active=true WHERE user_id='north-responder' AND workspace_id=$1",[NORTH]);}
  });
  await t.test('operation history is scoped and pending file removal waits for work or failure',async()=>{
   const first=await ops.list('north-reporter',NORTH,1,undefined,incident.id);assert.ok(first.nextBefore);const second=await ops.list('north-reporter',NORTH,1,first.nextBefore!,incident.id);assert.notEqual(first.items[0]!.id,second.items[0]!.id);
   await assert.rejects(ops.list('north-responder',NORTH,1,first.items[0]!.id,incident.id),{code:'invalid_cursor'});
   const r=await request('north-reporter','POST',incidentBase+'/attachments',{requestKey:'discard_'+crypto.randomUUID(),filename:'discard.txt',mime:'text/plain',base64:Buffer.from('Discard failed pending storage work').toString('base64')});const id=r.json().id,file=r.json().fileId;
   assert.equal((await request('north-reporter','DELETE',base+'/files/'+file)).statusCode,409);
   const job=(await db.pool.query('SELECT job_id FROM async_operations WHERE id=$1',[id])).rows[0].job_id;await ops.boss.cancel(QUEUE,job);await ops.reconcile();
   const removed=await request('north-reporter','DELETE',base+'/files/'+file);assert.equal(removed.statusCode,202);await settle(await claim(removed.json().id));await ops.reconcile();
   assert.equal((await db.pool.query('SELECT payload FROM async_operations WHERE id=$1',[id])).rows[0].payload.base64,undefined);
   assert.equal((await request('north-reporter','POST',base+'/operations/'+id+'/retry',{})).statusCode,409);
  });
  await t.test('quotas reject the twenty-first pending attachment without adding metadata or a job',async()=>{
   const target=await store.create('north-reporter',NORTH,{title:'Quota boundary synthetic incident',description:'Small fictional text used for pending attachment quota',severity:'low',serviceId:NORTH_SERVICE});
   for(let n=0;n<20;n++){const r=await request('north-reporter','POST',base+'/incidents/'+target.id+'/attachments',{requestKey:'quota_'+crypto.randomUUID(),filename:'quota.txt',mime:'text/plain',base64:Buffer.from('Fictional bounded evidence').toString('base64')});assert.equal(r.statusCode,202,r.body);}
   const before=(await db.pool.query('SELECT count(*) FROM pgboss.job')).rows[0].count;
   const r=await request('north-reporter','POST',base+'/incidents/'+target.id+'/attachments',{requestKey:'overflow_'+crypto.randomUUID(),filename:'quota.txt',mime:'text/plain',base64:Buffer.from('Fictional bounded evidence').toString('base64')});assert.equal(r.statusCode,409);assert.equal(r.json().error.code,'quota_exceeded');assert.equal((await db.pool.query('SELECT count(*) FROM pgboss.job')).rows[0].count,before);await drain();
  });
  await t.test('database foreign keys reject cross-workspace files and domain outbox failure rolls back incident changes',async()=>{
   const client=await db.pool.connect();try{await assert.rejects(client.query("INSERT INTO private_files(id,workspace_id,incident_id,owner_id,kind,filename,size,sha256) VALUES($1,$2,$3,'north-reporter','attachment','safe.txt',5,$4)",[crypto.randomUUID(),SOUTH,incident.id,digest('hello')]),{code:'23503'});}finally{client.release();}
   await db.pool.query("CREATE FUNCTION phase4_fail_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Controlled outbox failure'; END $$");await db.pool.query('CREATE TRIGGER phase4_outbox_fail BEFORE INSERT ON domain_outbox FOR EACH ROW EXECUTE FUNCTION phase4_fail_outbox()');
   const before=(await db.pool.query('SELECT count(*) FROM audit_events')).rows[0].count;
   try{await assert.rejects(store.act('north-reporter',NORTH,incident.id,{action:'comment',body:'This synthetic comment must roll back',expectedRevision:2}));assert.equal((await store.detail(NORTH,incident.id)).revision,2);assert.equal((await store.history(NORTH,incident.id,50)).items.length,1);assert.equal((await db.pool.query('SELECT count(*) FROM audit_events')).rows[0].count,before);}
   finally{await db.pool.query('DROP TRIGGER phase4_outbox_fail ON domain_outbox');await db.pool.query('DROP FUNCTION phase4_fail_outbox()');}
  });
  await t.test('cleanup is idempotent and stale orphan sweep respects live files and symlink boundaries',async()=>{
   const response=await request('north-reporter','DELETE',base+'/files/'+attachmentFile);assert.equal(response.statusCode,202);const id=response.json().id;
   assert.equal((await request('north-reporter','GET',base+'/files/'+attachmentFile)).statusCode,404);
   await settle(await claim(id));assert.equal((await request('north-reporter','DELETE',base+'/files/'+attachmentFile)).json().id,id);
   assert.ok(!(await readdir(root)).includes(attachmentFile+'.blob'));
   const orphan=crypto.randomUUID(),temp=crypto.randomUUID()+'.'+crypto.randomUUID()+'.tmp',outside=join(root,'outside.txt'),linked=crypto.randomUUID();
   await writeFile(join(root,orphan+'.blob'),'orphan');await writeFile(join(root,temp),'partial');await writeFile(outside,'must survive');await symlink(outside,join(root,linked+'.blob'));
   await assert.rejects(ops.storage.read(linked));const old=new Date(Date.now()-172800000);for(const name of [orphan+'.blob',temp])await utimes(join(root,name),old,old);await lutimes(join(root,linked+'.blob'),old,old);
   await utimes(join(root,exportFile+'.blob'),old,old);const report=await ops.cleanupStorage();assert.ok(report.removed.includes(orphan+'.blob'));assert.ok(report.removed.includes(temp));assert.equal(await readFile(outside,'utf8'),'must survive');assert.equal(digest(await ops.storage.read(exportFile)),(await db.pool.query('SELECT sha256 FROM private_files WHERE id=$1',[exportFile])).rows[0].sha256);
   await writeFile('evidence/phase4-storage-cleanup.json',JSON.stringify({backend:db.backend,removedStaleUnknown:report.removed.length,knownFilesRetained:report.retainedKnown,deletedAttachmentAbsent:true,outsideSymlinkTargetUnchanged:true,privateRootMode:(await lstat(root)).mode&0o777},null,2)+'\n');
   const unsafe=join(root,'root-link');await symlink(root,unsafe);await assert.rejects(new PrivateStorage(unsafe).init());
  });
  await writeFile('evidence/phase4-job-timeline.json',JSON.stringify({backend:db.backend,library:'pg-boss 12.37.0',native:'pending',failureSimulation:'Controlled errors/omitted completion, not an actual OS process kill',scenarios:trace},null,2)+'\n');
 }finally{await app.close();await ops.stop();await db.close();await rm(root,{recursive:true,force:true});}
});
