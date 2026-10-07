import {Pool} from 'pg';
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {RunbookVersion,type ContentInput,type SearchInput} from '../../../packages/contracts/src/knowledge.ts';
import {HttpError} from './errors.ts';
import {audit} from './audit.ts';
export function contentHash(input:ContentInput,serviceId:string|null){return createHash('sha256').update(JSON.stringify({title:input.title,body:input.body,category:input.category,serviceId})).digest('hex');}
const Cursor=z.strictObject({scope:z.string(),key:z.string(),id:z.uuid(),number:z.number().int()});
export class Knowledge {
 pool:Pool;secret:string;
 constructor(pool:Pool,secret:string){this.pool=pool;this.secret=secret;}
 async role(user:string,workspace:string){
  const row=await this.pool.query('SELECT role FROM memberships WHERE user_id=$1 AND workspace_id=$2 AND active=true',[user,workspace]);
  if(!row.rowCount)throw new HttpError(404,'not_found','Resource not found');return String(row.rows[0].role);
 }
 private dto(row:Record<string,unknown>){return RunbookVersion.parse({id:row.runbook_id,workspaceId:row.workspace_id,serviceId:row.service_id,number:row.number,revision:row.revision,title:row.title,body:row.body,category:row.category,status:row.status,contentHash:row.content_hash,createdBy:row.created_by,createdAt:(row.created_at as Date).toISOString()});}
 async version(user:string,workspace:string,id:string,number:number){
  const role=await this.role(user,workspace);
  const found=await this.pool.query('SELECT v.*,r.workspace_id,r.service_id,r.revision FROM runbooks r JOIN runbook_versions v ON v.runbook_id=r.id WHERE r.workspace_id=$1 AND r.id=$2 AND v.number=$3',[workspace,id,number]);
  if(!found.rowCount||(!['editor','admin'].includes(role)&&found.rows[0].status!=='published'))throw new HttpError(404,'not_found','Resource not found');
  return this.dto(found.rows[0]);
 }
 async write(user:string,workspace:string,input:(ContentInput|{expectedRevision:number}) & {serviceId?:string|undefined,expectedRevision?:number|undefined},id?:string,publication?:{action:'publish'|'withdraw',number:number},requestId:string=crypto.randomUUID()){
  const client=await this.pool.connect();
  let number=1,revision=1,service:string|null=input.serviceId??null;
  const objectId=id??crypto.randomUUID();
  try{
   await client.query('BEGIN');
   const member=await client.query('SELECT role FROM memberships WHERE user_id=$1 AND workspace_id=$2 AND active=true FOR SHARE',[user,workspace]);
   if(!member.rowCount)throw new HttpError(404,'not_found','Resource not found');
   if(!['editor','admin'].includes(member.rows[0].role))throw new HttpError(403,'forbidden_action','Knowledge editor access required');
   if(id){
    const head=await client.query('SELECT * FROM runbooks WHERE id=$1 AND workspace_id=$2 FOR UPDATE',[id,workspace]);
    if(!head.rowCount)throw new HttpError(404,'not_found','Resource not found');
    if(head.rows[0].revision!==input.expectedRevision)throw new HttpError(409,'revision_conflict','Runbook changed; refresh before retrying');
    revision=head.rows[0].revision+1;number=head.rows[0].latest_version+1;service=head.rows[0].service_id;
   }else{
    if(!('title' in input))throw new HttpError(400,'validation_error','Content required');
    if(service && !(await client.query('SELECT id FROM services WHERE id=$1 AND workspace_id=$2 AND active=true FOR SHARE',[service,workspace])).rowCount)throw new HttpError(404,'not_found','Resource not found');
    await client.query('INSERT INTO runbooks(id,workspace_id,service_id) VALUES($1,$2,$3)',[objectId,workspace,service]);
   }
   if(publication){
    number=publication.number;
    const version=await client.query('SELECT status FROM runbook_versions WHERE runbook_id=$1 AND number=$2 FOR UPDATE',[objectId,number]);
    if(!version.rowCount)throw new HttpError(404,'not_found','Resource not found');
    const valid=publication.action==='publish'?version.rows[0].status==='draft':version.rows[0].status==='published';
    if(!valid)throw new HttpError(409,'invalid_publication','Version cannot perform this publication action');
    await client.query('UPDATE runbook_versions SET status=$3 WHERE runbook_id=$1 AND number=$2',[objectId,number,publication.action==='publish'?'published':'withdrawn']);
    await client.query(publication.action==='publish'?'UPDATE runbooks SET revision=$2,published_version=$3 WHERE id=$1':'UPDATE runbooks SET revision=$2,published_version=CASE WHEN published_version=$3 THEN NULL ELSE published_version END WHERE id=$1',[objectId,revision,number]);
   }else{
    if(!('title' in input))throw new HttpError(400,'validation_error','Content required');
    await client.query('INSERT INTO runbook_versions(runbook_id,number,title,body,category,content_hash,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)',[objectId,number,input.title,input.body,input.category,contentHash({title:input.title,body:input.body,category:input.category},service),user]);
    if(id)await client.query('UPDATE runbooks SET revision=$2,latest_version=$3 WHERE id=$1',[objectId,revision,number]);
   }
   await audit(client,workspace,user,'runbook.'+(publication?.action??(id?'version':'create')),'runbook',objectId,revision,requestId);
   const row=await client.query('SELECT v.*,r.workspace_id,r.service_id,r.revision FROM runbooks r JOIN runbook_versions v ON v.runbook_id=r.id WHERE r.id=$1 AND v.number=$2',[objectId,number]);
   const result=this.dto(row.rows[0]);await client.query('COMMIT');return result;
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
 private signature(payload:string){return createHmac('sha256',this.secret).update(payload).digest('base64url');}
 async search(user:string,workspace:string,input:SearchInput){
  const role=await this.role(user,workspace);
  if(input.status!=='published'&&!['editor','admin'].includes(role))throw new HttpError(403,'forbidden_action','Knowledge editor access required');
  const scope=JSON.stringify({user,workspace,q:input.q,status:input.status,sort:input.sort,service:input.serviceId??null,category:input.category??null,pageSize:input.pageSize});
  let cursor:z.infer<typeof Cursor>|null=null;
  if(input.cursor){try{
   const [payload,sig,...extra]=input.cursor.split('.');
   if(!payload||!sig||extra.length)throw new Error();
   const expected=Buffer.from(this.signature(payload),'base64url'),actual=Buffer.from(sig,'base64url');
   if(expected.length!==actual.length||!timingSafeEqual(expected,actual))throw new Error();
   cursor=Cursor.parse(JSON.parse(Buffer.from(payload,'base64url').toString()));
   if(cursor.scope!==scope)throw new Error();
  }catch{throw new HttpError(400,'invalid_cursor','Invalid cursor');}}
  const order=input.sort==='title'?'v.title COLLATE "C",r.id,v.number':'v.created_at DESC,r.id DESC,v.number DESC';
  const predicate=input.sort==='title'?'(v.title COLLATE "C",r.id,v.number)>($6::text COLLATE "C",$7::uuid,$8::integer)':'(v.created_at,r.id,v.number)<($6::timestamptz,$7::uuid,$8::integer)';
  const rows=(await this.pool.query(`SELECT v.*,r.workspace_id,r.service_id,r.revision,to_char(v.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_time FROM runbooks r JOIN runbook_versions v ON v.runbook_id=r.id
   WHERE r.workspace_id=$1 AND v.status=$2 AND ($2<>'published' OR r.published_version=v.number)
   AND ($3='' OR v.search_vector@@websearch_to_tsquery('simple',$3)) AND ($4::uuid IS NULL OR r.service_id=$4) AND ($5::text IS NULL OR v.category=$5)
   AND ($6::text IS NULL OR ${predicate}) ORDER BY ${order} LIMIT $9`,[workspace,input.status,input.q,input.serviceId??null,input.category??null,cursor?.key??null,cursor?.id??null,cursor?.number??null,input.pageSize+1])).rows;
  const items=rows.slice(0,input.pageSize).map(row=>this.dto(row));let nextCursor:string|null=null;const last=items.at(-1);
  if(rows.length>input.pageSize&&last){const payload=Buffer.from(JSON.stringify({scope,key:input.sort==='title'?last.title:rows[input.pageSize-1].cursor_time,id:last.id,number:last.number})).toString('base64url');nextCursor=payload+'.'+this.signature(payload);}
  return {items,nextCursor};
 }
 async events(user:string,workspace:string,pageSize:number,before?:string){
  if(!['editor','admin'].includes(await this.role(user,workspace)))throw new HttpError(403,'forbidden_action','Audit access required');
  const rows=(await this.pool.query('SELECT seq,actor_id AS "actorId",action,object_type AS "objectType",object_id AS "objectId",revision,request_id AS "requestId",created_at AS "createdAt" FROM audit_events WHERE workspace_id=$1 AND ($2::bigint IS NULL OR seq<$2) ORDER BY seq DESC LIMIT $3',[workspace,before??null,pageSize+1])).rows;
  const items=rows.slice(0,pageSize);return {items,nextBefore:rows.length>pageSize?String(items.at(-1)?.seq):null};
 }
}
