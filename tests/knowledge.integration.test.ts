import {test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {testDatabase} from './database.ts';
import {seedLab,NORTH,SOUTH,NORTH_SERVICE} from '../scripts/seed.ts';
import {Store} from '../apps/api/src/store.ts';
import {Knowledge,contentHash} from '../apps/api/src/knowledge.ts';
import {buildApp} from '../apps/api/src/app.ts';
import {config} from '../apps/api/src/config.ts';
import {Search} from '../packages/contracts/src/knowledge.ts';
test('Phase 3 version/search/ACL/audit acceptance',async t=>{
 const db=await testDatabase(55438),password=process.env.TEST_PASSWORD??crypto.randomUUID()+'-Pass9!';
 await seedLab(db.pool,password);await seedLab(db.pool,password);
 const settings=config({DATABASE_URL:'postgresql://localhost/opsledger_test',AUTH_SECRET:crypto.randomUUID()+crypto.randomUUID(),BASE_URL:'http://localhost:3100',NODE_ENV:'test'});
 const store=new Store(db.pool,settings.AUTH_SECRET),knowledge=new Knowledge(db.pool,settings.AUTH_SECRET),app=await buildApp(store,settings);await app.ready();
 const cookies:Record<string,string>={};let peer=30;
 async function request(user:string,method:'GET'|'POST',url:string,payload?:Record<string,unknown>){
  return app.inject({method,url,headers:{cookie:cookies[user]!,origin:settings.BASE_URL},...(payload?{payload}:{})});
 }
 const base='/api/v1/workspaces/'+NORTH+'/runbooks';
 try{
  for(const user of ['north-editor','north-admin','north-reporter','north-lead','south-editor']){
   const r=await app.inject({method:'POST',url:'/api/auth/sign-in/email',remoteAddress:'127.0.0.'+peer++,headers:{origin:settings.BASE_URL},payload:{email:user+'@example.test',password}});
   assert.equal(r.statusCode,200);cookies[user]=r.cookies.map(c=>c.name+'='+c.value).join('; ');
  }
  t.diagnostic('Backend '+db.backend+'; server_version '+(await db.pool.query('SHOW server_version')).rows[0].server_version);
  await t.test('24 synthetic runbooks seed repeatably; current-public search uses FTS',async()=>{
   assert.equal((await db.pool.query('SELECT count(*) FROM runbooks')).rows[0].count,'24');
   const found=await knowledge.search('north-reporter',NORTH,Search.parse({q:'worker timeout',pageSize:50}));
   assert.equal(found.items.length,18);assert.ok(found.items.every(r=>r.workspaceId===NORTH&&r.status==='published'));
   const scoped=await knowledge.search('north-reporter',NORTH,Search.parse({q:'worker',serviceId:NORTH_SERVICE,category:'recovery',pageSize:50}));
   assert.ok(scoped.items.length>0&&scoped.items.every(r=>r.category==='recovery'&&r.serviceId===NORTH_SERVICE));
   assert.equal((await knowledge.search('north-reporter',NORTH,Search.parse({q:"' OR 1=1 --"}))).items.length,0);
  });
  await t.test('both sort modes paginate equal titles/timestamps without duplicates; cursor scope enforced',async()=>{
   for(const sort of ['title','newest'] as const){
    let cursor:string|undefined;const ids:string[]=[];
    do{
     const query=Search.parse({q:'timeout',sort,pageSize:3,...(cursor?{cursor}:{})});
     const page=await knowledge.search('north-reporter',NORTH,query);ids.push(...page.items.map(v=>v.id+':'+v.number));cursor=page.nextCursor??undefined;
     if(cursor){
      for(const patch of [{q:'other'},{sort:sort==='title'?'newest':'title'},{category:'security'},{cursor:cursor+'x'}])
       await assert.rejects(knowledge.search('north-reporter',NORTH,Search.parse({...query,cursor,...patch})),{code:'invalid_cursor'});
      await assert.rejects(knowledge.search('north-lead',NORTH,Search.parse({...query,cursor})),{code:'invalid_cursor'});
     }
    }while(cursor);
    assert.equal(ids.length,18);assert.equal(new Set(ids).size,18);
   }
  });
  await t.test('draft/withdrawn versions and other workspaces cannot leak to readers',async()=>{
   for(const number of [3,4,5]){
    const id='aaaaaaaa-aaaa-4aaa-8aaa-'+String(number).padStart(12,'0');
    assert.equal((await request('north-reporter','GET',base+'/'+id+'/versions/1')).statusCode,404);
    assert.equal((await request('north-editor','GET',base+'/'+id+'/versions/1')).statusCode,200);
   }
   assert.equal((await request('north-reporter','GET',base+'?status=draft')).statusCode,403);
   assert.equal((await request('south-editor','GET',base)).statusCode,404);
   assert.equal((await request('north-editor','GET','/api/v1/workspaces/'+SOUTH+'/runbooks')).statusCode,404);
  });
  await t.test('newest cursor preserves PostgreSQL microsecond precision',async()=>{
   const content={title:'Microsecond ordering',body:'microsecondneedle fictional precision fixture',category:'operations' as const};
   for(const fraction of ['000100','000200','000300']){
    const id=crypto.randomUUID();
    await db.pool.query('INSERT INTO runbooks(id,workspace_id) VALUES($1,$2)',[id,NORTH]);
    await db.pool.query("INSERT INTO runbook_versions(runbook_id,number,title,body,category,status,content_hash,created_by,created_at) VALUES($1,1,$2,$3,$4,'published',$5,'north-editor',$6)",[id,content.title,content.body,content.category,contentHash(content,null),'2026-02-01T00:00:00.'+fraction+'Z']);
    await db.pool.query('UPDATE runbooks SET published_version=1 WHERE id=$1',[id]);
   }
   let cursor:string|undefined;const ids:string[]=[];
   do{const found=await knowledge.search('north-reporter',NORTH,Search.parse({q:'microsecondneedle',sort:'newest',pageSize:1,...(cursor?{cursor}:{})}));ids.push(...found.items.map(x=>x.id));cursor=found.nextCursor??undefined;}while(cursor);
   assert.equal(ids.length,3);assert.equal(new Set(ids).size,3);
  });
  await t.test('publication, immutable citations, append, stale write and withdrawal',async()=>{
   const content={title:'Publication acceptance',body:'Unique provenance notes for a fictional service',category:'operations'};
   const created=await request('north-editor','POST',base,content);assert.equal(created.statusCode,201,created.body);const first=created.json();
   const url=base+'/'+first.id+'/versions/1';
   for(const user of ['north-reporter','north-lead'])assert.equal((await request(user,'POST',url+'/actions',{action:'publish',expectedRevision:1})).statusCode,403);
   assert.equal((await request('north-editor','POST',url+'/actions',{action:'publish',expectedRevision:1})).statusCode,200);
   const published=(await request('north-reporter','GET',url)).json();assert.equal(published.contentHash,first.contentHash);
   const next=await request('north-editor','POST',base+'/'+first.id+'/versions',{...content,body:content.body+' Revised.',expectedRevision:2});assert.equal(next.statusCode,201,next.body);
   assert.equal((await request('north-editor','POST',base+'/'+first.id+'/versions',{...content,expectedRevision:2})).statusCode,409);
   assert.equal((await request('north-editor','POST',base+'/'+first.id+'/versions/2/actions',{action:'publish',expectedRevision:3})).statusCode,200);
   assert.equal((await request('north-reporter','GET',url)).json().contentHash,published.contentHash);
   assert.equal((await request('north-editor','POST',base+'/'+first.id+'/versions/2/actions',{action:'withdraw',expectedRevision:4})).statusCode,200);
   assert.equal((await request('north-reporter','GET',base+'/'+first.id+'/versions/2')).statusCode,404);
   assert.equal((await knowledge.search('north-reporter',NORTH,Search.parse({q:'provenance'}))).items.length,0);
   const events=(await knowledge.events('north-editor',NORTH,100)).items.filter(e=>e.objectId===first.id&&e.action!=='access.denied');
   assert.deepEqual(events.map(e=>e.action),['runbook.withdraw','runbook.publish','runbook.version','runbook.publish','runbook.create']);
  });
  await t.test('DB rejects content/scope edits and audit update/delete',async()=>{
   const client=await db.pool.connect();
   try{
    for(const [sql,params] of [
     ['UPDATE runbook_versions SET body=$1 WHERE runbook_id=$2',['Changed immutable content','aaaaaaaa-aaaa-4aaa-8aaa-000000000001']],
     ['UPDATE runbooks SET workspace_id=$1 WHERE id=$2',[SOUTH,'aaaaaaaa-aaaa-4aaa-8aaa-000000000001']],
     ["UPDATE audit_events SET action='fake' WHERE seq=(SELECT min(seq) FROM audit_events)",[]],
     ['DELETE FROM audit_events WHERE seq=(SELECT min(seq) FROM audit_events)',[]]
    ] as const)await assert.rejects(client.query(sql,[...params]),{code:'23514'});
   }finally{client.release();}
  });
  await t.test('audit insertion failure rolls back knowledge creation and incident command',async()=>{
   const before=(await db.pool.query('SELECT count(*) FROM runbooks')).rows[0].count;
   const incident=await store.create('north-reporter',NORTH,{title:'Audit failure incident',description:'Fictional incident remains unchanged on audit failure',serviceId:NORTH_SERVICE,severity:'low'});
   await db.pool.query("CREATE FUNCTION phase3_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Controlled audit failure'; END $$");
   await db.pool.query('CREATE TRIGGER phase3_fail BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION phase3_fail_audit()');
   try{
    const response=await request('north-editor','POST',base,{title:'No partial runbook',body:'Audit failure must prevent persistence',category:'security'});
    assert.equal(response.statusCode,500);assert.ok(!response.body.includes('Controlled audit failure'));
    assert.equal((await db.pool.query('SELECT count(*) FROM runbooks')).rows[0].count,before);
    await assert.rejects(store.act('north-lead',NORTH,incident.id,{action:'triage',assigneeId:'north-responder',expectedRevision:1}));
    assert.equal((await store.detail(NORTH,incident.id)).revision,1);assert.equal((await store.history(NORTH,incident.id,50)).items.length,0);
    const count=(await db.pool.query('SELECT count(*) FROM incidents')).rows[0].count;
    await assert.rejects(store.create('north-reporter',NORTH,{title:'No unaudited create',description:'Audit failure must roll back the incident insert',serviceId:NORTH_SERVICE,severity:'low'}));
    assert.equal((await db.pool.query('SELECT count(*) FROM incidents')).rows[0].count,count);
   }finally{await db.pool.query('DROP TRIGGER phase3_fail ON audit_events');await db.pool.query('DROP FUNCTION phase3_fail_audit()');}
  });
  await t.test('audit is scoped, bounded, correlatable and omits content/auth data',async()=>{
   const first=await knowledge.events('north-editor',NORTH,3);assert.equal(first.items.length,3);assert.ok(first.nextBefore);
   const older=await knowledge.events('north-editor',NORTH,3,first.nextBefore!);assert.ok(!older.items.some(x=>first.items.some(y=>x.seq===y.seq)));
   assert.ok(first.items.every(x=>typeof x.requestId==='string'&&!('body' in x)&&!('password' in x)));
   assert.equal((await request('north-reporter','GET','/api/v1/workspaces/'+NORTH+'/audit')).statusCode,403);
   assert.ok((await db.pool.query("SELECT seq FROM audit_events WHERE workspace_id=$1 AND action='access.denied'",[NORTH])).rowCount);
   await writeFile('evidence/phase3-query-acl.json',JSON.stringify({backend:db.backend,seededRunbooks:24,publishedNorth:18,sorts:['title','newest'],pagination:'no duplicates across ties',readerDraft:'404',readerDraftSearch:'403',crossWorkspace:'404',withdrawnVersion:'404',auditMutations:'23514',nativeValidation:'pending'},null,2)+'\n');
  });
  await t.test('incident lifecycle continues when knowledge table is unavailable',async()=>{
   await db.pool.query('ALTER TABLE runbooks RENAME TO unavailable_runbooks');
   try{
    const i=await store.create('north-reporter',NORTH,{title:'Independent workflow',description:'Incident operations do not query knowledge storage',serviceId:NORTH_SERVICE,severity:'high'});
    let revision=1;
    for(const input of [{action:'triage',assigneeId:'north-responder'},{action:'investigate'},{action:'resolve',resolutionSummary:'Recovery confirmed without knowledge storage'},{action:'close'}] as const){
     const next=await store.act('north-lead',NORTH,i.id,{...input,expectedRevision:revision});revision=next.revision;
    }
    assert.equal((await store.detail(NORTH,i.id)).state,'closed');
   }finally{await db.pool.query('ALTER TABLE unavailable_runbooks RENAME TO runbooks');}
  });
 }finally{await app.close();await db.close();}
});
