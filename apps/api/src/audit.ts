import type {Pool,PoolClient} from 'pg';
export async function audit(db:Pool|PoolClient,workspace:string,actor:string,action:string,type:'incident'|'runbook',id:string,revision:number,requestId:string){
 await db.query('INSERT INTO audit_events(workspace_id,actor_id,action,object_type,object_id,revision,request_id) VALUES($1,$2,$3,$4,$5,$6,$7)',[workspace,actor,action,type,id,revision,requestId]);
}
