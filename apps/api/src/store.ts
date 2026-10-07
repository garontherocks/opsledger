import { Pool } from 'pg';
import { z } from 'zod';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Incident, type NewIncident } from '../../../packages/contracts/src/incident.ts';
import {Activity,type IncidentAction} from '../../../packages/contracts/src/lifecycle.ts';
import {nextState,type State} from './lifecycle.ts';
import {HttpError} from './errors.ts';
import {audit} from './audit.ts';
export {HttpError} from './errors.ts';

const Cursor=z.strictObject({workspaceId:z.uuid(),userId:z.string(),time:z.iso.datetime(),id:z.uuid()});
export class Store {
  pool:Pool;private secret:string;
  constructor(pool:Pool,secret:string){this.pool=pool;this.secret=secret;}
  async member(userId:string,workspaceId:string){
    const r=await this.pool.query('SELECT role FROM memberships WHERE user_id=$1 AND workspace_id=$2 AND active=true',[userId,workspaceId]);
    if(!r.rowCount)throw new HttpError(404,'not_found','Resource not found');
  }
  async me(userId:string){
    const r=await this.pool.query('SELECT w.id,w.name,m.role FROM memberships m JOIN workspaces w ON w.id=m.workspace_id WHERE m.user_id=$1 AND m.active=true ORDER BY w.name',[userId]);
    return r.rows;
  }
  async services(workspaceId:string){
    const r=await this.pool.query('SELECT id,name FROM services WHERE workspace_id=$1 AND active=true ORDER BY name',[workspaceId]);return r.rows;
  }
  async create(userId:string,workspaceId:string,input:NewIncident,requestId:string=crypto.randomUUID()){
    const client=await this.pool.connect();
    try{
    // The INSERT predicate verifies membership and service again in the write statement.
    const r=await client.query(`WITH made AS (INSERT INTO incidents(id,workspace_id,service_id,reporter_id,title,description,severity)
      SELECT $1,$2,$3,$4,$5,$6,$7 WHERE EXISTS(SELECT 1 FROM services WHERE id=$3 AND workspace_id=$2 AND active=true)
      AND EXISTS(SELECT 1 FROM memberships WHERE user_id=$4 AND workspace_id=$2 AND active=true) RETURNING *),
      logged AS (INSERT INTO audit_events(workspace_id,actor_id,action,object_type,object_id,revision,request_id)
      SELECT workspace_id,reporter_id,'incident.create','incident',id,revision,$8 FROM made RETURNING object_id)
      SELECT made.* FROM made JOIN logged ON logged.object_id=made.id`,
      [crypto.randomUUID(),workspaceId,input.serviceId,userId,input.title,input.description,input.severity,requestId]);
    if(!r.rowCount)throw new HttpError(404,'not_found','Resource not found');
    return this.dto(r.rows[0]);
    }finally{client.release();}
  }
  private dto(row:Record<string,unknown>){
    const date=(x:unknown)=>x instanceof Date?x.toISOString():new Date(String(x)).toISOString();
    return Incident.parse({id:row.id,workspaceId:row.workspace_id,serviceId:row.service_id,reporterId:row.reporter_id,title:row.title,
      description:row.description,severity:row.severity,state:row.state,revision:row.revision,assigneeId:row.assignee_id,resolutionSummary:row.resolution_summary,createdAt:date(row.created_at),updatedAt:date(row.updated_at)});
  }
  async detail(workspaceId:string,id:string){
    const r=await this.pool.query('SELECT * FROM incidents WHERE workspace_id=$1 AND id=$2',[workspaceId,id]);
    if(!r.rowCount)throw new HttpError(404,'not_found','Resource not found');return this.dto(r.rows[0]);
  }
  async assignees(workspaceId:string){
    return (await this.pool.query('SELECT m.user_id AS id,u.name FROM memberships m JOIN "user" u ON u.id=m.user_id WHERE m.workspace_id=$1 AND m.active=true AND m.role IN (\'responder\',\'lead\') ORDER BY u.name',[workspaceId])).rows;
  }
  async history(workspaceId:string,id:string,pageSize:number,before?:number){
    await this.detail(workspaceId,id);
    const rows=(await this.pool.query('SELECT * FROM incident_activity WHERE incident_id=$1 AND ($2::integer IS NULL OR revision<$2) ORDER BY revision DESC LIMIT $3',[id,before??null,pageSize+1])).rows;
    const items=rows.slice(0,pageSize).map(row=>Activity.parse({id:row.id,revision:row.revision,actorId:row.actor_id,kind:row.kind,fromState:row.from_state,toState:row.to_state,note:row.note,assigneeId:row.assignee_id,createdAt:row.created_at.toISOString()}));
    return {items,nextBeforeRevision:rows.length>pageSize?items.at(-1)?.revision??null:null};
  }
  async act(userId:string,workspaceId:string,id:string,input:IncidentAction,requestId:string=crypto.randomUUID()){
    const client=await this.pool.connect();
    try{
      await client.query('BEGIN');
      const membership=await client.query('SELECT role FROM memberships WHERE workspace_id=$1 AND user_id=$2 AND active=true FOR SHARE',[workspaceId,userId]);
      if(!membership.rowCount)throw new HttpError(404,'not_found','Resource not found');
      const found=await client.query('SELECT * FROM incidents WHERE workspace_id=$1 AND id=$2 FOR UPDATE',[workspaceId,id]);
      if(!found.rowCount)throw new HttpError(404,'not_found','Resource not found');
      const role:string=membership.rows[0].role;
      const privileged=['resolve','close','reopen'].includes(input.action);
      if(input.action!=='comment' && (privileged?role!=='lead':!['responder','lead'].includes(role)))throw new HttpError(403,'forbidden_action','Action not permitted');
      const current=found.rows[0];
      if(current.revision!==input.expectedRevision)throw new HttpError(409,'revision_conflict','Incident changed; refresh before retrying');
      const state=nextState(current.state as State,role,input);
      const assignee='assigneeId' in input&&input.assigneeId?input.assigneeId:current.assignee_id;
      if(['triage','assign','investigate','reopen'].includes(input.action) && assignee){
        const member=await client.query('SELECT user_id FROM memberships WHERE workspace_id=$1 AND user_id=$2 AND active=true AND role IN (\'responder\',\'lead\') FOR SHARE',[workspaceId,assignee]);
        if(!member.rowCount)throw new HttpError(404,'invalid_assignee','Assignee unavailable');
      }
      const resolution=input.action==='resolve'?input.resolutionSummary:input.action==='reopen'?null:current.resolution_summary;
      const updated=await client.query('UPDATE incidents SET state=$3,assignee_id=$4,resolution_summary=$5,revision=revision+1,updated_at=clock_timestamp() WHERE workspace_id=$1 AND id=$2 AND revision=$6 RETURNING *',[workspaceId,id,state,assignee,resolution,input.expectedRevision]);
      if(!updated.rowCount)throw new HttpError(409,'revision_conflict','Incident changed; refresh before retrying');
      const activityId=crypto.randomUUID();
      const note=input.action==='comment'?input.body:input.action==='resolve'?input.resolutionSummary:input.action==='reopen'?input.reason:null;
      await client.query('INSERT INTO incident_activity(id,incident_id,revision,actor_id,kind,from_state,to_state,note,assignee_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[activityId,id,updated.rows[0].revision,userId,input.action,current.state,state,note,assignee]);
      if(input.action==='comment')await client.query('INSERT INTO incident_comments(id,incident_id,activity_id,author_id,body) VALUES($1,$2,$3,$4,$5)',[crypto.randomUUID(),id,activityId,userId,input.body]);
      await audit(client,workspaceId,userId,'incident.'+input.action,'incident',id,updated.rows[0].revision,requestId);
      const result=this.dto(updated.rows[0]);await client.query('COMMIT');return result;
    }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  }
  private sign(payload:string){return createHmac('sha256',this.secret).update(payload).digest('base64url');}
  private decode(raw:string,userId:string,workspaceId:string){
    try{
      const [payload,signature,...extra]=raw.split('.');
      if(!payload||!signature||extra.length)throw new Error();
      const actual=Buffer.from(signature,'base64url'),expected=Buffer.from(this.sign(payload),'base64url');
      if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new Error();
      const cursor=Cursor.parse(JSON.parse(Buffer.from(payload,'base64url').toString('utf8')));
      if(cursor.userId!==userId||cursor.workspaceId!==workspaceId)throw new Error();
      return cursor;
    }catch{throw new HttpError(400,'invalid_cursor','Invalid cursor');}
  }
  async list(userId:string,workspaceId:string,pageSize:number,raw?:string){
    const cursor=raw?this.decode(raw,userId,workspaceId):null;
    const r=await this.pool.query(`SELECT *,to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_time FROM incidents WHERE workspace_id=$1
      AND ($2::timestamptz IS NULL OR (created_at,id)<($2::timestamptz,$3::uuid))
      ORDER BY created_at DESC,id DESC LIMIT $4`,[workspaceId,cursor?.time??null,cursor?.id??null,pageSize+1]);
    const items=r.rows.slice(0,pageSize).map(row=>this.dto(row));const last=items.at(-1);
    let nextCursor:string|null=null;
    if(r.rows.length>pageSize&&last){
      const payload=Buffer.from(JSON.stringify({workspaceId,userId,time:r.rows[pageSize-1].cursor_time,id:last.id})).toString('base64url');
      nextCursor=payload+'.'+this.sign(payload);
    }
    return {items,nextCursor};
  }
}
