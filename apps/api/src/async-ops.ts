import {PgBoss,type Job,type Db} from 'pg-boss';
import {Pool,type PoolClient} from 'pg';
import {z} from 'zod';
import {JobData,decodeText,type ExportRequest,type UploadRequest} from '../../../packages/contracts/src/async.ts';
import {HttpError} from './errors.ts';
import {audit} from './audit.ts';
import {PrivateStorage,digest} from './private-storage.ts';
export const QUEUE='opsledger-effects';
const adapter=(client:Pool|PoolClient):Db=>({executeSql:(text,values)=>client.query(text,values)});
const Operation=z.object({id:z.uuid(),kind:z.enum(['export','attach','cleanup','notify']),state:z.enum(['queued','completed','failed','cancelled']),attempts:z.number().int(),fileId:z.uuid().nullable(),lastError:z.string().nullable(),createdAt:z.date()});
const Timeline=z.object({seq:z.string(),event:z.string(),createdAt:z.date()});
const columns='id,kind,state,attempts,file_id AS "fileId",last_error AS "lastError",created_at AS "createdAt"';
export class AsyncOps{
 pool:Pool;boss:PgBoss;storage:PrivateStorage;private poll:ReturnType<typeof setTimeout>|undefined;private dispatching=false;private stopping=false;
 constructor(pool:Pool,root:string,backend:'postgres'|'pglite'='postgres',supervise=false){
  this.pool=pool;this.storage=new PrivateStorage(root);
  this.boss=new PgBoss({db:adapter(pool),backend,schedule:false,supervise,migrate:true});
  this.boss.on('error',()=>console.error('Queue unavailable; inspect operation status and database health'));
 }
 async start(){await this.storage.init();await this.boss.start();await this.boss.createQueue(QUEUE,{retryLimit:2,retryDelay:1,retryBackoff:true,expireInSeconds:30,retentionSeconds:86400,deleteAfterSeconds:604800});return this;}
 async stop(){this.stopping=true;if(this.poll)clearTimeout(this.poll);while(this.dispatching)await new Promise(resolve=>setTimeout(resolve,10));await this.boss.stop({graceful:true,timeout:10000});}
 async work(){
  await this.boss.work<{operationId:string}>(QUEUE,{batchSize:1,pollingIntervalSeconds:1},async jobs=>{for(const job of jobs)await this.handle(job);});
  const tick=async()=>{this.dispatching=true;try{await this.dispatch();await this.reconcile();}catch{console.error('Outbox dispatch unavailable; durable rows retained');}finally{this.dispatching=false;if(!this.stopping)this.poll=setTimeout(()=>void tick(),1000);}};
  void tick();
 }
 async handle(job:Job<{operationId:string}>){
  const input=JobData.parse(job.data);
  try{await this.effect(input.operationId);}
  catch(error){
   await this.pool.query("UPDATE async_operations SET last_error='effect_failed' WHERE id=$1 AND state='queued'",[input.operationId]);
   await this.pool.query("INSERT INTO operation_timeline(operation_id,event) VALUES($1,'attempt_failed')",[input.operationId]);throw error;
  }
 }
 async reconcile(){
  await this.pool.query("UPDATE async_operations SET payload='{}' WHERE state<>'queued' AND payload<>'{}'::jsonb AND file_id IN (SELECT id FROM private_files WHERE state='deleted')");
  await this.pool.query(`WITH failed AS (UPDATE async_operations o SET state='failed',last_error='retry_exhausted' FROM pgboss.job j WHERE o.job_id=j.id AND o.state='queued' AND j.state IN ('failed','cancelled') RETURNING o.id)
   INSERT INTO operation_timeline(operation_id,event) SELECT id,'retry_exhausted' FROM failed`);
  await this.pool.query(`WITH expired AS (UPDATE async_operations SET state='failed',last_error='job_retention_expired' WHERE state='queued' AND created_at<now()-interval '1 day' AND NOT EXISTS(SELECT 1 FROM pgboss.job j WHERE j.id=job_id) RETURNING id)
   INSERT INTO operation_timeline(operation_id,event) SELECT id,'job_retention_expired' FROM expired`);
 }
 private async member(client:PoolClient,user:string,workspace:string){
  const row=await client.query('SELECT role FROM memberships WHERE user_id=$1 AND workspace_id=$2 AND active FOR SHARE',[user,workspace]);
  if(!row.rowCount)throw new HttpError(404,'not_found','Resource not found');return String(row.rows[0].role);
 }
 private async enqueue(client:PoolClient,id:string){
  const jobId=await this.boss.send(QUEUE,{operationId:id},{db:adapter(client)});
  if(!jobId)throw new Error('Job not enqueued');await client.query('UPDATE async_operations SET job_id=$2 WHERE id=$1',[id,jobId]);
  await client.query("INSERT INTO operation_timeline(operation_id,event) VALUES($1,'enqueued')",[id]);
 }
 async request(user:string,workspace:string,incident:string,input:z.infer<typeof ExportRequest>|z.infer<typeof UploadRequest>,kind:'export'|'attach',requestId:string){
  const client=await this.pool.connect();const hash=digest(JSON.stringify({kind,incident,...input}));
  try{
   await client.query('BEGIN');await this.member(client,user,workspace);
   await client.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[workspace]);
   const found=await client.query('SELECT * FROM incidents WHERE id=$1 AND workspace_id=$2 FOR SHARE',[incident,workspace]);
   if(!found.rowCount)throw new HttpError(404,'not_found','Resource not found');
   const prior=await client.query(`SELECT ${columns},input_hash FROM async_operations WHERE workspace_id=$1 AND user_id=$2 AND request_key=$3`,[workspace,user,input.requestKey]);
   if(prior.rowCount){if(prior.rows[0].input_hash!==hash)throw new HttpError(409,'idempotency_conflict','Request key was used for different input');delete prior.rows[0].input_hash;await client.query('COMMIT');return Operation.parse(prior.rows[0]);}
   if(kind==='export'&&'expectedRevision' in input&&found.rows[0].revision!==input.expectedRevision)throw new HttpError(409,'revision_conflict','Incident changed; refresh before exporting');
   const count=await client.query("SELECT count(*) FROM async_operations WHERE workspace_id=$1 AND state='queued'",[workspace]);
   const owned=await client.query("SELECT count(*) FROM async_operations WHERE workspace_id=$1 AND user_id=$2 AND state='queued' AND kind<>'notify'",[workspace,user]);
   const quota=await client.query("SELECT count(*),coalesce(sum(size),0) AS bytes FROM private_files WHERE workspace_id=$1 AND state<>'deleted'",[workspace]);
   if(Number(count.rows[0].count)>=100||Number(owned.rows[0].count)>=20||Number(quota.rows[0].count)>=100)throw new HttpError(409,'quota_exceeded','Pending operation or file limit reached');
   let bytes:Buffer,filename:string;
   if(kind==='attach'&&'base64' in input){
    try{bytes=decodeText(input.base64);}catch{throw new HttpError(400,'invalid_text','Valid UTF-8 text up to 16 KiB required');}filename=input.filename;
    if((await client.query("SELECT count(*) FROM private_files WHERE incident_id=$1 AND kind='attachment' AND state<>'deleted'",[incident])).rows[0].count>=20)throw new HttpError(409,'quota_exceeded','Incident attachment limit reached');
   }else{
    const history=await client.query('SELECT revision,kind,from_state,to_state,note,assignee_id,created_at FROM incident_activity WHERE incident_id=$1 ORDER BY revision DESC LIMIT 50',[incident]);
    bytes=Buffer.from(JSON.stringify({format:'opsledger-incident-v1',incident:found.rows[0],activity:history.rows,activityLimit:50},null,2));filename='incident-'+incident+'-r'+found.rows[0].revision+'.json';
   }
   if(bytes.length>262144||Number(quota.rows[0].bytes)+bytes.length>8388608)throw new HttpError(409,'quota_exceeded','Private storage budget reached');
   const id=crypto.randomUUID(),file=crypto.randomUUID();
   await client.query('INSERT INTO private_files(id,workspace_id,incident_id,owner_id,kind,filename,size,sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[file,workspace,incident,user,kind==='attach'?'attachment':'export',filename,bytes.length,digest(bytes)]);
   await client.query('INSERT INTO async_operations(id,workspace_id,incident_id,user_id,kind,request_key,input_hash,payload,file_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,workspace,incident,user,kind,input.requestKey,hash,{base64:bytes.toString('base64')},file]);
   await this.enqueue(client,id);await audit(client,workspace,user,'async.'+kind+'.request','incident',incident,found.rows[0].revision,requestId);
   const result=(await client.query(`SELECT ${columns} FROM async_operations WHERE id=$1`,[id])).rows[0];await client.query('COMMIT');return Operation.parse(result);
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
 async remove(user:string,workspace:string,file:string,requestId:string){
  const client=await this.pool.connect();try{
   await client.query('BEGIN');const role=await this.member(client,user,workspace);await client.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[workspace]);
   const row=(await client.query('SELECT * FROM private_files WHERE id=$1 AND workspace_id=$2 FOR UPDATE',[file,workspace])).rows[0];
   if(!row)throw new HttpError(404,'not_found','Resource not found');
   if(row.owner_id!==user&&!['lead','admin'].includes(role))throw new HttpError(403,'forbidden_action','File owner or workspace file manager required');
   const key='cleanup_'+file;
   const prior=(await client.query(`SELECT ${columns} FROM async_operations WHERE workspace_id=$1 AND request_key=$2 AND kind='cleanup' ORDER BY created_at LIMIT 1`,[workspace,key])).rows[0];
   if(prior){await client.query('COMMIT');return Operation.parse(prior);}
   if(row.state!=='ready'&&(row.state!=='pending'||(await client.query("SELECT id FROM async_operations WHERE file_id=$1 AND state='queued'",[file])).rowCount))throw new HttpError(409,'file_not_ready','Wait for the current operation before removing the file');
   if(Number((await client.query("SELECT count(*) FROM async_operations WHERE workspace_id=$1 AND state='queued'",[workspace])).rows[0].count)>=100||Number((await client.query("SELECT count(*) FROM async_operations WHERE workspace_id=$1 AND user_id=$2 AND state='queued' AND kind<>'notify'",[workspace,user])).rows[0].count)>=20)throw new HttpError(409,'quota_exceeded','Pending operation limit reached');
   const id=crypto.randomUUID();await client.query("UPDATE private_files SET state='deleting' WHERE id=$1",[file]);
   await client.query("INSERT INTO async_operations(id,workspace_id,incident_id,user_id,kind,request_key,input_hash,payload,file_id) VALUES($1,$2,$3,$4,'cleanup',$5,$6,'{}',$7)",[id,workspace,row.incident_id,user,key,digest(key),file]);
   await this.enqueue(client,id);await audit(client,workspace,user,'async.cleanup.request','incident',row.incident_id,0,requestId);
   const result=(await client.query(`SELECT ${columns} FROM async_operations WHERE id=$1`,[id])).rows[0];await client.query('COMMIT');return Operation.parse(result);
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
 async effect(id:string){
  const client=await this.pool.connect();try{
   await client.query('BEGIN');const op=(await client.query('SELECT * FROM async_operations WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(!op)throw new Error('Unknown operation');if(op.state!=='queued'){await client.query('COMMIT');return;}
   const member=await client.query('SELECT role FROM memberships WHERE workspace_id=$1 AND user_id=$2 AND active FOR SHARE',[op.workspace_id,op.user_id]);
   await client.query('UPDATE async_operations SET attempts=attempts+1 WHERE id=$1',[id]);
   await client.query("INSERT INTO operation_timeline(operation_id,event) VALUES($1,'effect_started')",[id]);
   if(!member.rowCount){
    if(op.file_id&&op.kind!=='cleanup'){await this.storage.remove(op.file_id);await client.query("UPDATE private_files SET state='deleted' WHERE id=$1",[op.file_id]);}
    if(op.kind==='cleanup')await client.query("UPDATE private_files SET state='ready' WHERE id=$1 AND state='deleting'",[op.file_id]);
    await client.query("UPDATE async_operations SET state='cancelled',last_error='membership_revoked',payload='{}' WHERE id=$1",[id]);
    await client.query("INSERT INTO operation_timeline(operation_id,event) VALUES($1,'membership_revoked')",[id]);await client.query('COMMIT');return;
   }
   if(op.kind==='notify'){
    await client.query('INSERT INTO notifications(id,workspace_id,incident_id,user_id,event_id,message) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(user_id,event_id) DO NOTHING',[crypto.randomUUID(),op.workspace_id,op.incident_id,op.user_id,op.payload.eventId,op.payload.message]);
   }else{
    const file=(await client.query('SELECT * FROM private_files WHERE id=$1 AND workspace_id=$2 FOR UPDATE',[op.file_id,op.workspace_id])).rows[0];
    if(!file)throw new Error('File unavailable');
    if(op.kind==='cleanup'){
     if(file.owner_id!==op.user_id&&!['lead','admin'].includes(member.rows[0].role))throw new Error('File management role revoked');
     await this.storage.remove(file.id);await client.query("UPDATE private_files SET state='deleted' WHERE id=$1",[file.id]);
    }else{
     const bytes=Buffer.from(op.payload.base64,'base64');await this.storage.put(file.id,bytes,file.sha256);
     await client.query("UPDATE private_files SET state='ready' WHERE id=$1",[file.id]);
    }
   }
   await audit(client,op.workspace_id,op.user_id,'async.'+op.kind+'.complete','incident',op.incident_id,0,crypto.randomUUID());
   await client.query("UPDATE async_operations SET state='completed',payload='{}',last_error=NULL WHERE id=$1",[id]);
   await client.query("INSERT INTO operation_timeline(operation_id,event) VALUES($1,'effect_committed')",[id]);await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');await this.poolFreeFailure(client,id);throw error;}finally{client.release();}
 }
 private async poolFreeFailure(client:PoolClient,id:string){await client.query("UPDATE async_operations SET attempts=attempts+1 WHERE id=$1 AND state='queued'",[id]);}
 async dispatch(){
  for(let n=0;n<10;n++){
   const client=await this.pool.connect();try{
    await client.query('BEGIN');const event=(await client.query('SELECT * FROM domain_outbox WHERE NOT dispatched ORDER BY created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED')).rows[0];
    if(!event){await client.query('COMMIT');break;}
    await client.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[event.workspace_id]);
    if(Number((await client.query("SELECT count(*) FROM async_operations WHERE workspace_id=$1 AND state='queued'",[event.workspace_id])).rows[0].count)+new Set(event.recipients).size>100){await client.query('COMMIT');break;}
    for(const user of [...new Set<string>(event.recipients)]){
     if(!(await client.query('SELECT user_id FROM memberships WHERE workspace_id=$1 AND user_id=$2 AND active',[event.workspace_id,user])).rowCount)continue;
     const id=crypto.randomUUID(),key='notify_'+event.id+'_'+user;
     const made=await client.query("INSERT INTO async_operations(id,workspace_id,incident_id,user_id,kind,request_key,input_hash,payload) VALUES($1,$2,$3,$4,'notify',$5,$6,$7) ON CONFLICT DO NOTHING RETURNING id",[id,event.workspace_id,event.incident_id,user,key,digest(key),{eventId:event.id,message:'Incident '+event.payload.state+' · Revision '+event.revision}]);
     if(made.rowCount)await this.enqueue(client,id);
    }
    await client.query('UPDATE domain_outbox SET dispatched=true WHERE id=$1',[event.id]);await client.query('COMMIT');
   }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  }
 }
 async retry(user:string,workspace:string,id:string,requestId:string){
  const client=await this.pool.connect();try{
   await client.query('BEGIN');await this.member(client,user,workspace);await client.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[workspace]);
   const op=(await client.query('SELECT * FROM async_operations WHERE id=$1 AND workspace_id=$2 AND user_id=$3 FOR UPDATE',[id,workspace,user])).rows[0];
   if(!op)throw new HttpError(404,'not_found','Resource not found');
   if(op.state!=='failed'||op.manual_retries>=2)throw new HttpError(409,'retry_unavailable','Only failed operations with a remaining manual retry can retry');
   if(op.file_id&&!(await client.query("SELECT id FROM private_files WHERE id=$1 AND state<>'deleted'",[op.file_id])).rowCount)throw new HttpError(409,'retry_unavailable','File was removed');
   if(Number((await client.query("SELECT count(*) FROM async_operations WHERE workspace_id=$1 AND state='queued'",[workspace])).rows[0].count)>=100||Number((await client.query("SELECT count(*) FROM async_operations WHERE workspace_id=$1 AND user_id=$2 AND state='queued' AND kind<>'notify'",[workspace,user])).rows[0].count)>=20)throw new HttpError(409,'quota_exceeded','Pending operation limit reached');
   await client.query("UPDATE async_operations SET state='queued',manual_retries=manual_retries+1,last_error=NULL WHERE id=$1",[id]);await this.enqueue(client,id);
   await audit(client,workspace,user,'async.retry.request','incident',op.incident_id,0,requestId);const result=(await client.query(`SELECT ${columns} FROM async_operations WHERE id=$1`,[id])).rows[0];await client.query('COMMIT');
   return Operation.parse(result);
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
 async list(user:string,workspace:string,limit:number,before?:string,incident?:string){
  await this.reconcile();
  let boundary:string|null=null;
  if(before){const row=(await this.pool.query("SELECT to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') AS time FROM async_operations WHERE id=$1 AND workspace_id=$2 AND user_id=$3 AND ($4::uuid IS NULL OR incident_id=$4)",[before,workspace,user,incident??null])).rows[0];if(!row)throw new HttpError(400,'invalid_cursor','Invalid operation cursor');boundary=row.time;}
  const rows=(await this.pool.query(`SELECT ${columns} FROM async_operations WHERE workspace_id=$1 AND user_id=$2 AND ($3::uuid IS NULL OR incident_id=$3) AND ($4::timestamptz IS NULL OR (created_at,id)<($4::timestamptz,$5::uuid)) ORDER BY created_at DESC,id DESC LIMIT $6`,[workspace,user,incident??null,boundary,before??null,limit+1])).rows;
  const items=rows.slice(0,limit).map(row=>Operation.parse(row));return {items,nextBefore:rows.length>limit?items.at(-1)?.id??null:null};
 }
 async operation(user:string,workspace:string,id:string){
  await this.reconcile();
  const row=(await this.pool.query(`SELECT ${columns} FROM async_operations WHERE id=$1 AND workspace_id=$2 AND user_id=$3`,[id,workspace,user])).rows[0];
  if(!row)throw new HttpError(404,'not_found','Resource not found');
  const events=(await this.pool.query('SELECT seq,event,created_at AS "createdAt" FROM operation_timeline WHERE operation_id=$1 ORDER BY seq DESC LIMIT 20',[id])).rows;
  return {...Operation.parse(row),timeline:events.map(event=>Timeline.parse(event))};
 }
 async files(user:string,workspace:string,incident:string){
  return (await this.pool.query(`SELECT id,kind,filename,size,sha256,state,owner_id AS "ownerId" FROM private_files WHERE workspace_id=$1 AND incident_id=$2 AND state<>'deleted' AND (kind='attachment' OR owner_id=$3) ORDER BY created_at DESC,id DESC LIMIT 100`,[workspace,incident,user])).rows;
 }
 async download(user:string,workspace:string,file:string){
  const row=(await this.pool.query("SELECT * FROM private_files WHERE id=$1 AND workspace_id=$2 AND state='ready' AND (kind='attachment' OR owner_id=$3)",[file,workspace,user])).rows[0];
  if(!row)throw new HttpError(404,'not_found','Resource not found');
  try{const bytes=await this.storage.read(file);if(bytes.length!==row.size||digest(bytes)!==row.sha256)throw new Error();return {bytes,filename:row.filename,mime:row.kind==='attachment'?'text/plain; charset=utf-8':'application/json'};}catch{throw new HttpError(503,'storage_unavailable','File unavailable');}
 }
 async notices(user:string,workspace:string,limit:number,before?:string){
  let boundary:null|{created_at:string,id:string}=null;
  if(before){boundary=(await this.pool.query("SELECT to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') AS created_at,id FROM notifications WHERE id=$1 AND workspace_id=$2 AND user_id=$3",[before,workspace,user])).rows[0]??null;if(!boundary)throw new HttpError(400,'invalid_cursor','Invalid notification cursor');}
  const rows=(await this.pool.query('SELECT id,incident_id AS "incidentId",message,read_at AS "readAt",created_at AS "createdAt" FROM notifications WHERE workspace_id=$1 AND user_id=$2 AND ($3::timestamptz IS NULL OR (created_at,id)<($3::timestamptz,$4::uuid)) ORDER BY created_at DESC,id DESC LIMIT $5',[workspace,user,boundary?.created_at??null,boundary?.id??null,limit+1])).rows;
  const items=rows.slice(0,limit);return {items,nextBefore:rows.length>limit?items.at(-1)?.id??null:null};
 }
 async markRead(user:string,workspace:string,id:string){const r=await this.pool.query('UPDATE notifications SET read_at=coalesce(read_at,now()) WHERE id=$1 AND workspace_id=$2 AND user_id=$3 RETURNING id',[id,workspace,user]);if(!r.rowCount)throw new HttpError(404,'not_found','Resource not found');return {id};}
 async cleanupStorage(){const known=new Set<string>((await this.pool.query("SELECT id FROM private_files WHERE state<>'deleted'")).rows.map(row=>row.id));return this.storage.sweep(known,new Date(Date.now()-86400000));}
}
