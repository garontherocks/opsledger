import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {testDatabase} from './database.ts';
import {seedLab,NORTH,NORTH_SERVICE} from '../scripts/seed.ts';
import {Store} from '../apps/api/src/store.ts';
import {AsyncOps} from '../apps/api/src/async-ops.ts';

// Native row/FK locks are not modeled by the one-client PGlite harness.
test('native reopen and outbox dispatch preserve progress under controlled lock overlap',
 {skip:!process.env.TEST_DATABASE_URL?'Requires native PostgreSQL row locks':false,timeout:15000},
 async()=>{
 const db=await testDatabase(),root=await mkdtemp(join(tmpdir(),'opsledger-lock-proof-'));
 const store=new Store(db.pool,'synthetic-lock-test-secret');
 let operations:AsyncOps|undefined;
 try{
  await seedLab(db.pool,crypto.randomUUID()+'-Pass9!');
  const incident=await store.create('north-reporter',NORTH,{title:'Controlled lifecycle lock overlap',description:'Synthetic evidence for lifecycle and notification concurrency',serviceId:NORTH_SERVICE,severity:'high'});
  await store.act('north-lead',NORTH,incident.id,{action:'triage',assigneeId:'north-responder',expectedRevision:1});
  await store.act('north-lead',NORTH,incident.id,{action:'investigate',expectedRevision:2});
  await store.act('north-lead',NORTH,incident.id,{action:'comment',body:'Synthetic investigation evidence',expectedRevision:3});
  await store.act('north-lead',NORTH,incident.id,{action:'resolve',resolutionSummary:'Synthetic recovery before recurrence',expectedRevision:4});
  await store.act('north-lead',NORTH,incident.id,{action:'close',expectedRevision:5});
  await db.pool.query('UPDATE domain_outbox SET dispatched=true WHERE incident_id<>$1 OR revision<>6',[incident.id]);
  const actorLocked=Promise.withResolvers<void>(),workspaceLocked=Promise.withResolvers<void>();
  const events:string[]=[];
  const overlapped=new Proxy(db.pool,{get(pool,key){
   if(key==='connect')return async()=>{
    const client=await pool.connect();
    return new Proxy(client,{get(target,property){
     if(property==='query')return async(sql:string,values?:unknown[])=>{
      const result=await target.query(sql,values);
      if(sql.startsWith('SELECT * FROM incidents WHERE workspace_id=')&&values?.includes(incident.id)){
       events.push('mutation incident row locked');actorLocked.resolve();await workspaceLocked.promise;
      }
      if(sql==='SELECT id FROM workspaces WHERE id=$1 FOR UPDATE'){
       events.push('dispatcher workspace row locked');workspaceLocked.resolve();
      }
      return result;
     };
     const value=Reflect.get(target,property);return typeof value==='function'?value.bind(target):value;
    }});
   };
   const value=Reflect.get(pool,key);return typeof value==='function'?value.bind(pool):value;
  }});
  operations=await new AsyncOps(overlapped,root,'postgres').start();
  const mutation=new Store(overlapped,'synthetic-lock-test-secret').act('north-lead',NORTH,incident.id,{action:'reopen',reason:'Failure recurred after controlled recovery',expectedRevision:6});
  // Both handlers retain their real SQL. Barriers guarantee incident -> workspace
  // overlap, without sleeps, retries, altered deadlock settings or mocked effects.
  await actorLocked.promise;
  const results=await Promise.allSettled([mutation,operations.dispatch()]);
  const outcomes=results.map(result=>result.status==='fulfilled'?{status:'fulfilled'}:{status:'rejected',code:String(result.reason?.code??'unknown')});
  console.log('LIFECYCLE_LOCK_PROOF '+JSON.stringify({backend:db.backend,events,outcomes}));
  await writeFile('evidence/m3-lifecycle-lock-proof.json',JSON.stringify({syntheticOnly:true,backend:db.backend,events,outcomes},null,2)+'\n');
  assert.deepEqual(outcomes,[{status:'fulfilled'},{status:'fulfilled'}]);
  const final=await store.detail(NORTH,incident.id);
  assert.equal(final.state,'investigating');assert.equal(final.revision,7);assert.equal(final.resolutionSummary,null);
  const activity=await store.history(NORTH,incident.id,50);
  assert.equal(activity.items.filter(entry=>entry.kind==='reopen').length,1);
  assert.equal(activity.items[0]!.revision,7);
  assert.equal((await db.pool.query('SELECT count(*) FROM domain_outbox WHERE incident_id=$1 AND revision=7',[incident.id])).rows[0].count,'1');
  assert.ok(Number((await db.pool.query("SELECT count(*) FROM async_operations WHERE incident_id=$1 AND kind='notify'",[incident.id])).rows[0].count)>0);
 }finally{await operations?.stop();await db.close();await rm(root,{recursive:true,force:true});}
});
