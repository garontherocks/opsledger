import {test} from 'node:test';
import assert from 'node:assert/strict';
import {testDatabase} from './database.ts';
import {seedLab,NORTH,NORTH_SERVICE} from '../scripts/seed.ts';
import {config} from '../apps/api/src/config.ts';
import {Store} from '../apps/api/src/store.ts';
import {buildApp} from '../apps/api/src/app.ts';
test('Phase 5 server flags and graceful outage boundaries',async t=>{
 const db=await testDatabase(55440);await seedLab(db.pool,process.env.TEST_PASSWORD!);
 const settings=config({NODE_ENV:'test',DATABASE_URL:'postgresql://localhost/opsledger_test',AUTH_SECRET:crypto.randomUUID()+crypto.randomUUID(),READ_ONLY:'true',KNOWLEDGE_ENABLED:'false',ASYNC_ENABLED:'false'});
 const store=new Store(db.pool,settings.AUTH_SECRET),app=await buildApp(store,settings);await app.ready();
 try{
  const login=await app.inject({method:'POST',url:'/api/auth/sign-in/email',payload:{email:'north-reporter@example.test',password:process.env.TEST_PASSWORD}});assert.equal(login.statusCode,200);
  const headers={origin:settings.BASE_URL,cookie:login.cookies.map(c=>c.name+'='+c.value).join('; ')};
  const base='/api/v1/workspaces/'+NORTH;
  await t.test('capabilities are server-derived; no AI capability',async()=>{
   const response=await app.inject({url:'/api/v1/me',headers});assert.deepEqual(response.json().features,{readOnly:true,knowledge:false,async:false,ai:false,embeddings:false});assert.equal(response.headers['cache-control'],'no-store');
  });
  await t.test('maintenance rejects direct writes without domain mutations',async()=>{
   const before=(await db.pool.query('SELECT count(*) FROM incidents')).rows[0].count;
   const response=await app.inject({method:'POST',url:base+'/incidents',headers,payload:{title:'Cannot write during maintenance',description:'Controlled maintenance write rejection',severity:'low',serviceId:NORTH_SERVICE}});
   assert.equal(response.statusCode,503);assert.equal(response.json().error.code,'read_only');assert.equal((await db.pool.query('SELECT count(*) FROM incidents')).rows[0].count,before);assert.match(response.json().error.requestId,/^[a-f0-9-]{36}$/);
  });
  await t.test('disabled knowledge and async reject direct API reads',async()=>{
   const response=await app.inject({url:base+'/runbooks',headers});assert.equal(response.statusCode,503);assert.equal(response.json().error.code,'feature_disabled');assert.equal((await app.inject({url:base+'/notifications',headers})).statusCode,503);
   assert.equal((await app.inject({url:base+'/incidents',headers})).statusCode,200);
  });
  await t.test('database outage is safe and recovers without restart',async()=>{
   const original=store.me.bind(store);store.me=async()=>{throw Object.assign(new Error('internal database topology secret'),{code:'ECONNREFUSED'});};
   try{const failed=await app.inject({url:'/api/v1/me',headers});assert.equal(failed.statusCode,503);assert.ok(!failed.body.includes('topology'));assert.equal(failed.headers['x-content-type-options'],'nosniff');}
   finally{store.me=original;}
   assert.equal((await app.inject({url:'/api/v1/me',headers})).statusCode,200);
  });
  await t.test('sign out remains available during maintenance',async()=>{assert.equal((await app.inject({method:'POST',url:'/api/auth/sign-out',headers,payload:{}})).statusCode,200);assert.equal((await app.inject({url:'/api/v1/me',headers})).statusCode,401);});
 }finally{await app.close();await db.close();}
});
