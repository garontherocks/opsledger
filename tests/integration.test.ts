import {test}from'node:test';
import assert from'node:assert/strict';
import { Pool }from'pg';
import{testDatabase}from'./database.ts';
import{migrate}from'../scripts/migrate.ts';
import{seedLab,NORTH,SOUTH,NORTH_SERVICE,SOUTH_SERVICE}from'../scripts/seed.ts';
import{Store}from'../apps/api/src/store.ts';
import{buildApp}from'../apps/api/src/app.ts';
import{config}from'../apps/api/src/config.ts';

test('authenticated incident acceptance against PostgreSQL protocol',async t=>{
  const database=await testDatabase();const password=process.env.TEST_PASSWORD??crypto.randomUUID()+'-Pass9!';
  const settings=config({DATABASE_URL:'postgresql://localhost/opsledger_test',AUTH_SECRET:crypto.randomUUID()+crypto.randomUUID(),BASE_URL:'http://localhost:3100',NODE_ENV:'test'});
  await migrate(database.pool);await seedLab(database.pool,password);await seedLab(database.pool,password);
  const app=await buildApp(new Store(database.pool,settings.AUTH_SECRET),settings);await app.ready();
  const valid={title:'Incident '+crypto.randomUUID(),description:'Unexpected worker timeout after request',severity:'high',serviceId:NORTH_SERVICE};
  async function login(email:string){
    const r=await app.inject({method:'POST',url:'/api/auth/sign-in/email',headers:{origin:settings.BASE_URL},payload:{email,password}});
    assert.equal(r.statusCode,200,r.body);
    return r.cookies.map(c=>c.name+'='+c.value).join('; ');
  }
  try{
    await t.test('incorrect password cannot create a browser session',async()=>{
      const response=await app.inject({method:'POST',url:'/api/auth/sign-in/email',remoteAddress:'127.0.0.99',headers:{origin:settings.BASE_URL},payload:{email:'north-reporter@example.test',password:'Incorrect synthetic password9!'}});
      assert.equal(response.statusCode,401);assert.equal(response.cookies.length,0);
    });
    const version=await database.pool.query('show server_version');
    t.diagnostic('Backend '+database.backend+'; server_version '+version.rows[0].server_version);
    const cookie=await login('north-reporter@example.test'),southCookie=await login('south-reporter@example.test');
    const headers={cookie,origin:settings.BASE_URL};
    let incidentId='';
    await t.test('no session fails; safe identity contains no auth secrets',async()=>{
      assert.equal((await app.inject('/api/v1/me')).statusCode,401);
      const me=await app.inject({url:'/api/v1/me',headers});
      assert.deepEqual(Object.keys(me.json().user).sort(),['email','id','name']);
    });
    await t.test('create persists expected server-controlled fields',async()=>{
      const r=await app.inject({method:'POST',url:'/api/v1/workspaces/'+NORTH+'/incidents',headers,payload:valid});
      assert.equal(r.statusCode,201,r.body);const body=r.json();incidentId=body.id;
      assert.equal(body.reporterId,'north-reporter');assert.equal(body.state,'reported');assert.equal(body.revision,1);
      assert.equal(body.workspaceId,NORTH);assert.ok(r.headers.location);
      const row=await database.pool.query('SELECT title FROM incidents WHERE id=$1',[incidentId]);assert.equal(row.rows[0].title,valid.title);
      const detail=await app.inject({url:'/api/v1/workspaces/'+NORTH+'/incidents/'+incidentId,headers});assert.equal(detail.json().title,valid.title);
    });
    await t.test('cross-workspace IDs, membership and service spoof denied',async()=>{
      for(const path of ['/api/v1/workspaces/'+SOUTH+'/incidents','/api/v1/workspaces/'+SOUTH+'/incidents/'+incidentId])
        assert.equal((await app.inject({url:path,headers})).statusCode,404);
      assert.equal((await app.inject({url:'/api/v1/workspaces/'+NORTH+'/incidents/'+incidentId,headers:{cookie:southCookie}})).statusCode,404);
      const r=await app.inject({method:'POST',url:'/api/v1/workspaces/'+NORTH+'/incidents',headers,payload:{...valid,serviceId:SOUTH_SERVICE}});
      assert.equal(r.statusCode,404);assert.ok(!r.body.includes(valid.description));
    });
    await t.test('revoked member rejected despite valid auth session',async()=>{
      const cookie=await login('revoked-reporter@example.test');
      assert.equal((await app.inject({url:'/api/v1/workspaces/'+NORTH+'/incidents',headers:{cookie}})).statusCode,404);
    });
    await t.test('inactive and unknown service denied without inserting rows',async()=>{
      const before=await database.pool.query('SELECT count(*) FROM incidents');
      await database.pool.query('UPDATE services SET active=false WHERE id=$1',[NORTH_SERVICE]);
      try{
        for(const serviceId of [NORTH_SERVICE,crypto.randomUUID()])assert.equal((await app.inject({method:'POST',url:'/api/v1/workspaces/'+NORTH+'/incidents',headers,payload:{...valid,serviceId}})).statusCode,404);
      }finally{await database.pool.query('UPDATE services SET active=true WHERE id=$1',[NORTH_SERVICE]);}
      assert.deepEqual((await database.pool.query('SELECT count(*) FROM incidents')).rows,before.rows);
    });
    await t.test('invalid/spoofed body and oversized input rejected',async()=>{
      for(const patch of [{title:'x'},{description:'short'},{severity:'urgent'},{title:'x'.repeat(121)},{role:'admin'},{workspaceId:SOUTH},{state:'resolved'},{reporterId:'south-reporter'}])
        assert.equal((await app.inject({method:'POST',url:'/api/v1/workspaces/'+NORTH+'/incidents',headers,payload:{...valid,...patch}})).statusCode,400);
      assert.equal((await app.inject({method:'POST',url:'/api/v1/workspaces/'+NORTH+'/incidents',headers,payload:{...valid,description:'x'.repeat(40000)}})).statusCode,413);
    });
    await t.test('pagination stable with ties; tampered/cross-user cursor rejected',async()=>{
      for(let i=0;i<4;i++)await app.inject({method:'POST',url:'/api/v1/workspaces/'+NORTH+'/incidents',headers,payload:{...valid,title:'Tie '+i+' '+crypto.randomUUID()}});
      await database.pool.query("UPDATE incidents SET created_at='2026-01-01T00:00:00Z' WHERE workspace_id=$1",[NORTH]);
      let cursor:string|null=null;const ids:string[]=[];
      do{
        const path:string='/api/v1/workspaces/'+NORTH+'/incidents?pageSize=2'+(cursor?'&cursor='+encodeURIComponent(cursor):'');
        const r=await app.inject({url:path,headers});assert.equal(r.statusCode,200,r.body);
        const page:{items:{id:string}[];nextCursor:string|null}=r.json();ids.push(...page.items.map(x=>x.id));cursor=page.nextCursor;
        if(cursor){
          assert.equal((await app.inject({url:'/api/v1/workspaces/'+NORTH+'/incidents?cursor='+encodeURIComponent(cursor+'x'),headers})).statusCode,400);
          await assert.rejects(new Store(database.pool,settings.AUTH_SECRET).list('other-user',NORTH,2,cursor),{code:'invalid_cursor'});
          await assert.rejects(new Store(database.pool,settings.AUTH_SECRET).list('north-reporter',SOUTH,2,cursor),{code:'invalid_cursor'});
        }
      }while(cursor);
      assert.equal(ids.length,5);assert.equal(new Set(ids).size,5);
      for(const [index,id] of ids.entries())await database.pool.query("UPDATE incidents SET created_at='2026-01-01T00:00:00Z'::timestamptz + $2::integer * interval '0.0001 second' WHERE id=$1",[id,index+1]);
      const preciseIds:string[]=[];const store=new Store(database.pool,settings.AUTH_SECRET);cursor=null;
      do{const page=await store.list('north-reporter',NORTH,1,cursor??undefined);preciseIds.push(...page.items.map(x=>x.id));cursor=page.nextCursor;}while(cursor);
      assert.equal(preciseIds.length,5);assert.equal(new Set(preciseIds).size,5);
    });
    await t.test('foreign keys reject cross-workspace service at DB boundary',async()=>{
      const client=await database.pool.connect();try{await assert.rejects(client.query('INSERT INTO incidents(id,workspace_id,service_id,reporter_id,title,description,severity) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [crypto.randomUUID(),NORTH,SOUTH_SERVICE,'north-reporter','Valid title','Valid long description','high']),{code:'23503'});}finally{client.release();}
    });
    await t.test('signup closed, hostile origin/Host cannot grant auth access',async()=>{
      assert.equal((await app.inject({method:'POST',url:'/api/auth/sign-up/email',headers:{origin:settings.BASE_URL},payload:{name:'Bad',email:'bad@example.test',password}})).statusCode,400);
      assert.equal((await app.inject({method:'POST',url:'/api/v1/workspaces/'+NORTH+'/incidents',headers:{...headers,origin:'http://evil.example.test'},payload:valid})).statusCode,403);
      const spoof=await app.inject({url:'/api/v1/me',headers:{cookie,host:'evil.example.test'}});assert.equal(spoof.statusCode,200);
    });
    await t.test('expired session rejected with cookie still present',async()=>{
      await database.pool.query('UPDATE session SET expires_at=(now() AT TIME ZONE \'UTC\')-interval \'1 hour\' WHERE user_id=$1',['south-reporter']);
      assert.equal((await app.inject({url:'/api/v1/me',headers:{cookie:southCookie}})).statusCode,401);
    });
    await t.test('revocation invalidates subsequent browser/API access',async()=>{
      const r=await app.inject({method:'POST',url:'/api/auth/sign-out',headers,payload:{}});assert.equal(r.statusCode,200);
      assert.equal((await app.inject({url:'/api/v1/me',headers})).statusCode,401);
    });
    await t.test('database outage returns 503 with safe correlated envelope',async()=>{
      const dead=new Pool({host:'127.0.0.1',port:1,connectionTimeoutMillis:100});
      const failed=await buildApp(new Store(dead,settings.AUTH_SECRET),settings);
      try{const r=await failed.inject('/health/ready');assert.equal(r.statusCode,503);assert.ok(r.json().error.requestId);assert.ok(!r.body.includes('ECONNREFUSED'));}finally{await failed.close();await dead.end();}
    });
    await t.test('production request rate limit remains enforced',async()=>{
      for(let i=0;i<100;i++)assert.equal((await app.inject({url:'/health/live',remoteAddress:'127.0.0.202'})).statusCode,200);
      const response=await app.inject({url:'/health/live',remoteAddress:'127.0.0.202'});
      assert.equal(response.statusCode,429);assert.ok(response.json().error.requestId);
    });
  }finally{await app.close();await database.close();}
});
