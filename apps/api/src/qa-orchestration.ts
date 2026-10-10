import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import Fastify from 'fastify';
import {QaWorkflow} from './qa-workflow.ts';
import {QA_SHA} from './qa-state.ts';
import {hash} from './qa-agent.ts';
import {HttpError} from './errors.ts';

export const QaWebhook=z.strictObject({version:z.literal('qa-webhook-v1'),eventId:z.uuid(),runId:z.uuid(),workspaceId:z.uuid(),sha:QA_SHA,issuedAt:z.number().int().positive(),operation:z.enum(['inspect','store_report']),approvalId:z.uuid().optional()});
export const TriageDraft=z.strictObject({status:z.enum(['draft','abstain']),risks:z.array(z.enum(['revision-conflict','workspace-isolation','outbox-deadlock','http-audience'])).max(4),note:z.string().max(1000),operationalAuthority:z.literal(false)});
const Outcome=z.strictObject({eventId:z.uuid(),runId:z.uuid(),sha:QA_SHA,outcome:z.enum(['pending','failed','awaiting_review','approved','complete','inconclusive']),triage:TriageDraft.nullable(),reportStored:z.boolean(),operationalAuthority:z.literal(false),releaseAuthority:z.literal(false)});
export type ServiceGrant={runId:string,workspaceId:string,userId:string,expiresAt:number};
export type TriageService=(signal:AbortSignal)=>Promise<unknown>;
const deny=()=>new HttpError(403,'qa_service_denied','Scoped QA service request denied');
function equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
// Canonical schema field order; transport whitespace/key order do not alter identity.
export function webhookSignature(input:unknown,key:string){return createHmac('sha256',key).update(JSON.stringify(QaWebhook.parse(input))).digest('hex');}

export class QaOrchestration{
 readonly flow:QaWorkflow;private readonly triage:TriageService;private readonly triageDeadlineMs:number;
 private readonly grant:Readonly<ServiceGrant>;private readonly credential:string;private readonly signingKey:string;
 constructor(flow:QaWorkflow,grant:ServiceGrant,credential:string,signingKey:string,triage:TriageService,triageDeadlineMs=30000){
  this.flow=flow;this.triage=triage;this.triageDeadlineMs=triageDeadlineMs;
  this.grant=Object.freeze({...grant});z.uuid().parse(grant.runId);z.uuid().parse(grant.workspaceId);z.string().min(1).parse(grant.userId);z.number().int().positive().parse(grant.expiresAt);
  if(credential.length<32||signingKey.length<32||equal(credential,signingKey)||triageDeadlineMs<50||triageDeadlineMs>30000)throw deny();this.credential=credential;this.signingKey=signingKey;
 }
 private auth(body:z.infer<typeof QaWebhook>,bearer:string,signature:string){
  if(!equal(bearer,'Bearer '+this.credential)||!equal(signature,webhookSignature(body,this.signingKey))||Math.abs(Date.now()-body.issuedAt)>60000||this.grant.expiresAt<=Date.now()||body.runId!==this.grant.runId||body.workspaceId!==this.grant.workspaceId||body.sha!==this.flow.store.sha)throw deny();
  if(body.operation==='store_report'&&!body.approvalId)throw deny();
 }
 async handle(input:unknown,bearer:string,signature:string){
  const body=QaWebhook.parse(input);this.auth(body,bearer,signature);const identity={workspaceId:this.grant.workspaceId,userId:this.grant.userId};
  // Read rechecks current membership/owner/provenance even for a cached event.
  await this.flow.read(identity,body.runId);const requestHash=hash(JSON.stringify(body)),lease=randomUUID();
  const claim=await this.flow.store.transaction(identity,async c=>{
   const inserted=await c.query("INSERT INTO qa_dispatches(event_id,run_id,request_hash,lease_id,lease_until) VALUES($1,$2,$3,$4,clock_timestamp()+interval '60 seconds') ON CONFLICT DO NOTHING RETURNING event_id",[body.eventId,body.runId,requestHash,lease]);
   if(inserted.rowCount)return {owned:true,cached:null};
   const row=(await c.query('SELECT * FROM qa_dispatches WHERE event_id=$1 FOR UPDATE',[body.eventId])).rows[0];if(row.request_hash!==requestHash||row.run_id!==body.runId)throw deny();
   if(row.result){const cached=Outcome.parse(row.result);if(!this.flow.store.validMac(cached,row.result_mac)||cached.eventId!==body.eventId||cached.runId!==body.runId||cached.sha!==body.sha)throw deny();return {owned:false,cached};}
   const recovered=await c.query("UPDATE qa_dispatches SET lease_id=$2,lease_until=clock_timestamp()+interval '60 seconds' WHERE event_id=$1 AND lease_until<=clock_timestamp() RETURNING event_id",[body.eventId,lease]);return {owned:!!recovered.rowCount,cached:null};
  });
  if(claim.cached)return claim.cached;
  const base={eventId:body.eventId,runId:body.runId,sha:body.sha,triage:null,reportStored:false,operationalAuthority:false as const,releaseAuthority:false as const};
  if(!claim.owned)return Outcome.parse({...base,outcome:'pending'});
  try{
   let snapshot=await this.flow.read(identity,body.runId);let triage:z.infer<typeof TriageDraft>|null=null;
   if(body.operation==='store_report'){
    if(snapshot.report){const report=snapshot.report as {approvalId:string};if(report.approvalId!==body.approvalId)throw deny();}
    else{const a=snapshot.approval;if(!a||a.id!==body.approvalId)throw deny();await this.flow.consume(identity,body.runId,{key:body.eventId,expectedRevision:snapshot.state.revision,approvalId:a.id,sha:body.sha,actionHash:a.actionHash},Math.min(this.grant.expiresAt,body.issuedAt+60000));snapshot=await this.flow.read(identity,body.runId);}
   }else if(snapshot.workflow?.stage==='awaiting_review'){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),this.triageDeadlineMs);
    try{triage=TriageDraft.parse(await Promise.race([this.triage(controller.signal),new Promise<never>((_,reject)=>controller.signal.addEventListener('abort',()=>reject(new Error('triage_timeout')),{once:true}))]));}catch{triage=null;}finally{clearTimeout(timer);}
   }
   this.auth(body,bearer,signature);snapshot=await this.flow.read(identity,body.runId);
   const stage=snapshot.workflow?.stage;
   const outcome=snapshot.report?'complete':stage==='blocked'||stage==='denied'?'failed':stage==='approved'?'approved':stage==='awaiting_review'?(triage?'awaiting_review':'inconclusive'):'pending';
   const result=Outcome.parse({...base,outcome,triage,reportStored:!!snapshot.report});
   await this.flow.store.transaction(identity,async c=>{const saved=await c.query('UPDATE qa_dispatches SET result=$3,result_mac=$4 WHERE event_id=$1 AND lease_id=$2 AND lease_until>clock_timestamp() AND result IS NULL',[body.eventId,lease,result,this.flow.store.mac(result)]);if(saved.rowCount!==1)throw deny();});return result;
  }catch(error){await this.flow.store.pool.query("UPDATE qa_dispatches SET lease_until=clock_timestamp() WHERE event_id=$1 AND lease_id=$2 AND result IS NULL",[body.eventId,lease]);throw error;}
 }
}
export function orchestrationApp(service:QaOrchestration){
 const app=Fastify({logger:false,bodyLimit:4096});
 app.setErrorHandler((error,_request,reply)=>{const status=error instanceof HttpError?error.status:400;void reply.code(status).send({error:'qa_orchestration_denied'});});
 app.post('/events',async(request,reply)=>{if(request.headers.origin)throw deny();const result=await service.handle(request.body,request.headers.authorization??'',String(request.headers['x-qa-signature']??''));reply.header('cache-control','no-store');return result;});
 return app;
}
