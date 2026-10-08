import {vector} from '@electric-sql/pglite-pgvector';
import assert from 'node:assert/strict';
import {mkdtemp,rm,cp,readFile,writeFile,readdir,lstat} from 'node:fs/promises';
import {tmpdir,cpus,totalmem} from 'node:os';
import {join} from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {Pool} from 'pg';
import {testDatabase} from '../tests/database.ts';
import {seedLab,NORTH,SOUTH,NORTH_SERVICE} from './seed.ts';
import {migrate} from './migrate.ts';
import {config} from '../apps/api/src/config.ts';
import {buildApp} from '../apps/api/src/app.ts';
import {Store} from '../apps/api/src/store.ts';
import {AsyncOps,QUEUE} from '../apps/api/src/async-ops.ts';
import {digest} from '../apps/api/src/private-storage.ts';
// Deliberately isolated PGlite fixture: no live/user backup, no native restore claim.
if(process.env.TEST_DATABASE_URL)throw new Error('Local restore baseline requires disposable embedded fixture; unset TEST_DATABASE_URL');
const root=await mkdtemp(join(tmpdir(),'opsledger-restore-'));
const source=await testDatabase(55441);const password=crypto.randomUUID()+'-Pass9!';
const settings=config({NODE_ENV:'test',DATABASE_URL:'postgresql://localhost/opsledger_test',AUTH_SECRET:crypto.randomUUID()+crypto.randomUUID()});
let ops:AsyncOps|undefined;let restored:PGlite|undefined;let socket:PGLiteSocketServer|undefined;let pool:Pool|undefined;let closed=false;
const tables=['app_migrations','incidents','incident_activity','incident_comments','runbooks','runbook_versions','audit_events','domain_outbox','async_operations','operation_timeline','private_files','notifications','memberships'];
async function fingerprints(db:Pool){const result:Record<string,{rows:number,sha256:string}>={};for(const table of tables){const rows=(await db.query(`SELECT row_to_json(t) AS data FROM ${table} t`)).rows.map(row=>JSON.stringify(row.data)).sort();result[table]={rows:rows.length,sha256:digest(JSON.stringify(rows))};}return result;}
try{
 await seedLab(source.pool,password);const store=new Store(source.pool,settings.AUTH_SECRET);
 const incident=await store.create('north-reporter',NORTH,{title:'Restore drill synthetic incident',description:'Quiesced restore snapshot and private export consistency',severity:'high',serviceId:NORTH_SERVICE});
 await store.act('north-lead',NORTH,incident.id,{action:'triage',assigneeId:'north-responder',expectedRevision:1});
 ops=await new AsyncOps(source.pool,join(root,'live'),'pglite').start();
 const operation=await ops.request('north-reporter',NORTH,incident.id,{requestKey:'restore_'+crypto.randomUUID(),expectedRevision:2},'export',crypto.randomUUID());
 await ops.dispatch();
 for(let n=0;n<20;n++){const jobs=await ops.boss.fetch<{operationId:string}>(QUEUE,{batchSize:20,includeMetadata:true});if(!jobs.length)break;for(const job of jobs){await ops.handle(job);await ops.boss.complete(QUEUE,job);}}
 assert.equal((await ops.operation('north-reporter',NORTH,operation.id)).state,'completed');
 const file=(await source.pool.query('SELECT id,sha256 FROM private_files WHERE id=$1',[operation.fileId])).rows[0];assert.equal(digest(await ops.storage.read(file.id)),file.sha256);
 await ops.stop();ops=undefined;
 const before=await fingerprints(source.pool);const started=performance.now();
 const backup=await source.dump!();await cp(join(root,'live'),join(root,'backup'),{recursive:true});
 await source.close();closed=true;
 const restoreStart=performance.now();restored=await PGlite.create({loadDataDir:backup,extensions:{vector}});socket=new PGLiteSocketServer({db:restored,host:'127.0.0.1',port:55441});await socket.start();
 pool=new Pool({host:'127.0.0.1',port:55441,user:'postgres',database:'postgres',max:1});await migrate(pool);await cp(join(root,'backup'),join(root,'restored'),{recursive:true});
 assert.deepEqual(await fingerprints(pool),before);
 assert.equal((await pool.query('SELECT count(*) FROM async_operations o LEFT JOIN pgboss.job j ON j.id=o.job_id WHERE j.id IS NULL')).rows[0].count,'0');
 assert.ok(Number((await pool.query('SELECT count(*) FROM notifications')).rows[0].count)>0);
 assert.equal((await lstat(join(root,'restored'))).mode&0o777,0o700);
 const bytes=await readFile(join(root,'restored',file.id+'.blob'));assert.equal(digest(bytes),file.sha256);assert.equal(JSON.parse(bytes.toString()).incident.revision,2);
 assert.equal((await lstat(join(root,'restored',file.id+'.blob'))).mode&0o777,0o600);
 const app=await buildApp(new Store(pool,settings.AUTH_SECRET),settings);await app.ready();
 try{
  const login=await app.inject({method:'POST',url:'/api/auth/sign-in/email',payload:{email:'north-reporter@example.test',password}});assert.equal(login.statusCode,200);const headers={cookie:login.cookies.map(c=>c.name+'='+c.value).join('; ')};
  assert.equal((await app.inject({url:'/api/v1/workspaces/'+NORTH+'/incidents/'+incident.id,headers})).json().revision,2);
  assert.equal((await app.inject({url:'/api/v1/workspaces/'+SOUTH+'/incidents/'+incident.id,headers})).statusCode,404);
  const restoreMs=performance.now()-restoreStart;
  await writeFile('evidence/phase5-restore.json',JSON.stringify({backend:'PGlite 0.5.8 / embedded PostgreSQL 18.3',scope:'quiesced synthetic DB dump plus private files, same version',backupBytes:backup.size,backupSha256:digest(Buffer.from(await backup.arrayBuffer())),tables:before,privateFileHash:file.sha256,privateFiles:(await readdir(join(root,'restored'))).length,restoreMs,totalDrillMs:performance.now()-started,checks:['exact table fingerprints','migration checksums unchanged','queue job references and notifications retained','0700 restored root','revision 2 export hash','0600 file permissions','retained credential sign-in','cross-workspace 404'],nativeRestore:false,liveBackup:false,temporaryBackupRetained:false},null,2));
  const measurements:Record<string,unknown>={};
  for(const [name,url]of [['incident-list','/api/v1/workspaces/'+NORTH+'/incidents'],['incident-detail','/api/v1/workspaces/'+NORTH+'/incidents/'+incident.id],['knowledge-search','/api/v1/workspaces/'+NORTH+'/runbooks?q=worker&pageSize=10']]){
   for(let n=0;n<3;n++)assert.equal((await app.inject({url:url!,headers,remoteAddress:'127.0.0.2'})).statusCode,200);
   const values:number[]=[];for(let n=0;n<30;n++){const start=performance.now();const response=await app.inject({url:url!,headers,remoteAddress:'127.0.0.3'});assert.equal(response.statusCode,200);values.push(performance.now()-start);}
   values.sort((a,b)=>a-b);measurements[name!]={samples:30,p50Ms:values[14],p95Ms:values[28],maxMs:values[29]};
  }
  await writeFile('evidence/phase5-performance.json',JSON.stringify({at:new Date().toISOString(),node:process.version,cpu:cpus()[0]?.model,logicalCpus:cpus().length,memoryBytes:totalmem(),backend:'PGlite 0.5.8, pool max=1',transport:'Fastify inject (no network or browser)',load:'serial, 3 warmups then 30 successful requests per route',fixture:'2 workspaces, 24 runbooks, 1 incident revision 2',lockfileSha256:digest(await readFile('package-lock.json')),measurements,ai:false,productionSla:false},null,2));
 }finally{await app.close();}
 console.log('Local restore drill and deterministic pre-AI benchmark passed. Native/live-backup gates remain pending.');
}finally{await ops?.stop();if(!closed)await source.close();await pool?.end();await socket?.stop();if(restored){await new Promise<void>(resolve=>setImmediate(resolve));await restored.close();}await rm(root,{recursive:true,force:true});}
