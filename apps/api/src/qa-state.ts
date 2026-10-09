import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import type {Pool,PoolClient} from 'pg';
import {hash} from './qa-agent.ts';
import {HttpError} from './errors.ts';

export const QA_SHA=z.string().regex(/^[a-f0-9]{40}$/);
export const QA_HASH=z.string().regex(/^[a-f0-9]{64}$/);
export const QA_RISK=z.enum(['revision-conflict','workspace-isolation','outbox-deadlock','http-audience']);
export const QaState=z.strictObject({version:z.literal('qa-state-v1'),id:z.uuid(),workspaceId:z.uuid(),ownerId:z.string().min(1).max(128),sha:QA_SHA,contextHash:QA_HASH,status:z.enum(['created','context_ready']),revision:z.number().int().min(1).max(32),expiresAt:z.number().int().positive(),operationalAuthority:z.literal(false)});
export type QaState=z.infer<typeof QaState>;
export type QaIdentity={workspaceId:string,userId:string};
export type QaProvenance={id:string,sha:string,digest:string,path:string};
const Finding=z.strictObject({id:z.uuid(),runId:z.uuid(),workspaceId:z.uuid(),ownerId:z.string(),reviewerId:z.string(),risk:QA_RISK,sourceId:z.string(),sourceSha:QA_SHA,sourceDigest:QA_HASH,contextHash:QA_HASH,sha:QA_SHA,expiresAt:z.number().int().positive(),untrusted:z.literal(true)});
const Event=z.strictObject({kind:z.enum(['created','checkpoint','memory_reviewed']),stateHash:QA_HASH,revision:z.number().int().min(1).max(32)});
const denied=()=>new HttpError(404,'qa_scope','QA run unavailable');
const conflict=()=>new HttpError(409,'qa_conflict','QA state changed or is invalid');
// State is a mutable typed checkpoint. History is append-only audit. Memory is
// reviewed expiring risk metadata, not state, instructions, transcripts or secrets.
export class QaStore{
 readonly pool:Pool;readonly sha:string;readonly contextHash:string;readonly sources:readonly QaProvenance[];private readonly secret:string;
 constructor(pool:Pool,secret:string,sha:string,sources:QaProvenance[]){
  this.pool=pool;this.secret=secret;this.sha=QA_SHA.parse(sha);
  this.sources=Object.freeze(sources.map(s=>Object.freeze(z.strictObject({id:z.string().min(1).max(64),sha:QA_SHA,digest:QA_HASH,path:z.string().max(160)}).parse(s))));
  if(!this.sources.length||new Set(this.sources.map(s=>s.id)).size!==this.sources.length)throw new Error('qa_sources');this.contextHash=hash(JSON.stringify(this.sources));
 }
 mac(value:unknown){return createHmac('sha256',this.secret).update(JSON.stringify(value)).digest('hex');}
 validMac(value:unknown,expected:string){const a=Buffer.from(this.mac(value)),b=Buffer.from(expected);return a.length===b.length&&timingSafeEqual(a,b);}
 async transaction<T>(identity:QaIdentity,work:(client:PoolClient,role:string)=>Promise<T>):Promise<T>{
  z.uuid().parse(identity.workspaceId);z.string().min(1).max(128).parse(identity.userId);const c=await this.pool.connect();
  try{await c.query('BEGIN');await c.query("SET LOCAL statement_timeout='5000'");
   const m=await c.query('SELECT role FROM memberships WHERE workspace_id=$1 AND user_id=$2 AND active=true FOR SHARE',[identity.workspaceId,identity.userId]);if(!m.rowCount)throw denied();
   const result=await work(c,m.rows[0].role);await c.query('COMMIT');return result;
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 async locked(c:PoolClient,identity:QaIdentity,id:string){
  z.uuid().parse(id);const r=await c.query('SELECT * FROM qa_runs WHERE id=$1 AND workspace_id=$2 AND owner_id=$3 FOR NO KEY UPDATE',[id,identity.workspaceId,identity.userId]);if(!r.rowCount)throw denied();
  const row=r.rows[0];let state:QaState;try{state=QaState.parse(row.state);}catch{throw conflict();}
  if(!this.validMac(state,row.state_mac)||state.id!==row.id||state.workspaceId!==row.workspace_id||state.ownerId!==row.owner_id||state.sha!==this.sha||state.contextHash!==this.contextHash||state.expiresAt<=Date.now())throw conflict();
  await this.history(c,state);return state;
 }
 async history(c:PoolClient,state:QaState){
  const h=await c.query('SELECT * FROM qa_history WHERE run_id=$1 ORDER BY sequence',[state.id]);let previous='';
  if(h.rows.length!==state.revision)throw conflict();
  for(let i=0;i<h.rows.length;i++){const r=h.rows[i];let event:z.infer<typeof Event>;try{event=Event.parse(r.event);}catch{throw conflict();}
   const signed={runId:state.id,sequence:i+1,key:r.operation_key,requestHash:r.request_hash,event,previous};
   if(r.sequence!==i+1||r.previous_mac!==previous||!this.validMac(signed,r.event_mac)||event.revision!==i+1)throw conflict();previous=r.event_mac;
  }
  if(h.rows.at(-1)?.event.stateHash!==hash(JSON.stringify(state)))throw conflict();return h.rows.map(r=>({sequence:r.sequence,event:r.event,eventMac:r.event_mac}));
 }
 async append(c:PoolClient,state:QaState,key:string,requestHash:string,kind:z.infer<typeof Event>['kind']){
  const p=await c.query('SELECT event_mac FROM qa_history WHERE run_id=$1 ORDER BY sequence DESC LIMIT 1',[state.id]);const previous=p.rows[0]?.event_mac??'';
  const event={kind,stateHash:hash(JSON.stringify(state)),revision:state.revision};const signed={runId:state.id,sequence:state.revision,key,requestHash,event,previous};
  await c.query('INSERT INTO qa_history VALUES($1,$2,$3,$4,$5,$6,$7)',[state.id,state.revision,key,requestHash,event,previous,this.mac(signed)]);
  await c.query('UPDATE qa_runs SET state=$2,state_mac=$3 WHERE id=$1',[state.id,state,this.mac(state)]);
 }
 async create(identity:QaIdentity){return this.transaction(identity,async c=>{
  const state:QaState={version:'qa-state-v1',id:randomUUID(),workspaceId:identity.workspaceId,ownerId:identity.userId,sha:this.sha,contextHash:this.contextHash,status:'created',revision:1,expiresAt:Date.now()+3600000,operationalAuthority:false};
  await c.query('INSERT INTO qa_runs(id,workspace_id,owner_id,state,state_mac) VALUES($1,$2,$3,$4,$5)',[state.id,state.workspaceId,state.ownerId,state,this.mac(state)]);
  await this.append(c,state,randomUUID(),hash('create'),'created');return state;
 });}
 async read(identity:QaIdentity,id:string){return this.transaction(identity,async c=>{const state=await this.locked(c,identity,id);return {state,history:await this.history(c,state),memory:await this.memory(c,state)};});}
 async checkpoint(identity:QaIdentity,id:string,revision:number,key:string){
  z.uuid().parse(key);z.number().int().positive().parse(revision);const requestHash=hash(JSON.stringify({revision,status:'context_ready'}));
  return this.transaction(identity,async c=>{const state=await this.locked(c,identity,id);const old=await c.query('SELECT request_hash FROM qa_history WHERE run_id=$1 AND operation_key=$2',[id,key]);
   if(old.rowCount){if(old.rows[0].request_hash!==requestHash)throw conflict();return state;}
   if(state.revision!==revision||state.status!=='created')throw conflict();const next:QaState={...state,status:'context_ready',revision:state.revision+1};await this.append(c,next,key,requestHash,'checkpoint');return next;
  });
 }
 async remember(identity:QaIdentity,id:string,input:unknown){
  const body=z.strictObject({key:z.uuid(),expectedRevision:z.number().int().positive(),sourceId:z.string().max(64),risk:QA_RISK,ttlSeconds:z.number().int().min(1).max(3600)}).parse(input);
  return this.transaction(identity,async(c,role)=>{if(!['lead','admin'].includes(role))throw denied();const state=await this.locked(c,identity,id);const requestHash=hash(JSON.stringify(body));
   const old=await c.query('SELECT request_hash FROM qa_history WHERE run_id=$1 AND operation_key=$2',[id,body.key]);if(old.rowCount){if(old.rows[0].request_hash!==requestHash)throw conflict();return state;}
   if(state.status!=='context_ready'||state.revision!==body.expectedRevision||state.revision>=32)throw conflict();const source=this.sources.find(s=>s.id===body.sourceId);if(!source)throw denied();
   const finding=Finding.parse({id:randomUUID(),runId:id,workspaceId:state.workspaceId,ownerId:state.ownerId,reviewerId:identity.userId,risk:body.risk,sourceId:source.id,sourceSha:source.sha,sourceDigest:source.digest,contextHash:state.contextHash,sha:state.sha,expiresAt:Math.min(state.expiresAt,Date.now()+body.ttlSeconds*1000),untrusted:true});
   await c.query('INSERT INTO qa_memory VALUES($1,$2,$3,$4,$5)',[finding.id,id,body.key,finding,this.mac(finding)]);
   const next={...state,revision:state.revision+1};await this.append(c,next,body.key,requestHash,'memory_reviewed');return next;
  });
 }
 async memory(c:PoolClient,state:QaState){
  const rows=await c.query('SELECT * FROM qa_memory WHERE run_id=$1 ORDER BY id LIMIT 32',[state.id]);const out:z.infer<typeof Finding>[]=[];
  for(const row of rows.rows){let f:z.infer<typeof Finding>;try{f=Finding.parse(row.finding);}catch{throw conflict();}
   if(!this.validMac(f,row.finding_mac)||f.runId!==state.id||f.workspaceId!==state.workspaceId||f.ownerId!==state.ownerId)throw conflict();
   const s=this.sources.find(s=>s.id===f.sourceId);if(!s||f.sha!==state.sha||f.contextHash!==state.contextHash||s.sha!==f.sourceSha||s.digest!==f.sourceDigest||f.expiresAt<=Date.now())continue;
   const m=await c.query("SELECT 1 FROM memberships WHERE workspace_id=$1 AND user_id=$2 AND active=true AND role IN ('lead','admin') FOR SHARE",[state.workspaceId,f.reviewerId]);if(m.rowCount)out.push(f);
  }return out;
 }
}
