import { Pool } from 'pg';
import { z } from 'zod';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Incident, type NewIncident } from '../../../packages/contracts/src/incident.ts';

const Cursor=z.strictObject({workspaceId:z.uuid(),userId:z.string(),time:z.iso.datetime(),id:z.uuid()});
export class HttpError extends Error {
  status:number;code:string;
  constructor(status:number,code:string,message:string){super(message);this.status=status;this.code=code;}
}
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
  async create(userId:string,workspaceId:string,input:NewIncident){
    // The INSERT predicate verifies membership and service again in the write statement.
    const r=await this.pool.query(`INSERT INTO incidents(id,workspace_id,service_id,reporter_id,title,description,severity)
      SELECT $1,$2,$3,$4,$5,$6,$7 WHERE EXISTS(SELECT 1 FROM services WHERE id=$3 AND workspace_id=$2 AND active=true)
      AND EXISTS(SELECT 1 FROM memberships WHERE user_id=$4 AND workspace_id=$2 AND active=true) RETURNING *`,
      [crypto.randomUUID(),workspaceId,input.serviceId,userId,input.title,input.description,input.severity]);
    if(!r.rowCount)throw new HttpError(404,'not_found','Resource not found');
    return this.dto(r.rows[0]);
  }
  private dto(row:Record<string,unknown>){
    const date=(x:unknown)=>x instanceof Date?x.toISOString():new Date(String(x)).toISOString();
    return Incident.parse({id:row.id,workspaceId:row.workspace_id,serviceId:row.service_id,reporterId:row.reporter_id,title:row.title,
      description:row.description,severity:row.severity,state:row.state,revision:row.revision,createdAt:date(row.created_at),updatedAt:date(row.updated_at)});
  }
  async detail(workspaceId:string,id:string){
    const r=await this.pool.query('SELECT * FROM incidents WHERE workspace_id=$1 AND id=$2',[workspaceId,id]);
    if(!r.rowCount)throw new HttpError(404,'not_found','Resource not found');return this.dto(r.rows[0]);
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
    const r=await this.pool.query(`SELECT * FROM incidents WHERE workspace_id=$1
      AND ($2::timestamptz IS NULL OR (created_at,id)<($2::timestamptz,$3::uuid))
      ORDER BY created_at DESC,id DESC LIMIT $4`,[workspaceId,cursor?.time??null,cursor?.id??null,pageSize+1]);
    const items=r.rows.slice(0,pageSize).map(row=>this.dto(row));const last=items.at(-1);
    let nextCursor:string|null=null;
    if(r.rows.length>pageSize&&last){
      const payload=Buffer.from(JSON.stringify({workspaceId,userId,time:last.createdAt,id:last.id})).toString('base64url');
      nextCursor=payload+'.'+this.sign(payload);
    }
    return {items,nextCursor};
  }
}
