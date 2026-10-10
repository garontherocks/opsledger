import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {QaStore,QA_SHA,QA_HASH,type QaIdentity,type QaState} from './qa-state.ts';
import {hash} from './qa-agent.ts';
import {HttpError} from './errors.ts';
export const QA_CHECKS=['domain_policy','qa_context','mcp_boundary','skill_http'] as const;
export const QaReceipt=z.strictObject({version:z.literal('qa-lab-checks-v1'),sha:QA_SHA,checks:z.array(z.strictObject({name:z.enum(QA_CHECKS),passed:z.boolean()})).length(4),scope:z.literal('registered-lab-checks-only'),operationalAuthority:z.literal(false)});
export type QaReceipt=z.infer<typeof QaReceipt>;
export interface QaRunner{currentSha():Promise<string>;run(sha:string,signal:AbortSignal):Promise<QaReceipt>}
const Workflow=z.strictObject({version:z.literal('qa-workflow-v1'),runId:z.uuid(),stage:z.enum(['checks_pending','awaiting_review','approved','complete','denied','blocked']),attempts:z.number().int().min(1).max(2),leaseId:z.uuid(),leaseUntil:z.number().int().positive(),receiptHash:QA_HASH.nullable(),approvalId:z.uuid().nullable(),actionHash:QA_HASH.nullable()});
const Approval=z.strictObject({id:z.uuid(),runId:z.uuid(),workspaceId:z.uuid(),ownerId:z.string(),reviewerId:z.string(),sha:QA_SHA,action:z.literal('store_reviewed_qa_report'),actionHash:QA_HASH,receiptHash:QA_HASH,contextHash:QA_HASH,expiresAt:z.number().int().positive(),decision:z.enum(['approve','deny']),operationalAuthority:z.literal(false)});
const fail=()=>new HttpError(409,'qa_workflow','QA workflow is stale, blocked or already consumed');
export const QaDecision=z.strictObject({key:z.uuid(),expectedRevision:z.number().int().positive(),sha:QA_SHA,actionHash:QA_HASH,decision:z.enum(['approve','deny']),ttlSeconds:z.number().int().min(1).max(300)});
export const QaConsume=z.strictObject({key:z.uuid(),expectedRevision:z.number().int().positive(),approvalId:z.uuid(),sha:QA_SHA,actionHash:QA_HASH});
const Report=z.strictObject({version:z.literal('qa-report-v1'),runId:z.uuid(),testedSha:QA_SHA,receiptHash:QA_HASH,checks:QaReceipt.shape.checks,scope:z.literal('registered-lab-checks-only'),reviewerId:z.string(),approvalId:z.uuid(),qualityVerified:z.literal(false),operationalAuthority:z.literal(false),releaseAuthority:z.literal(false)});
// Deterministic durable routing. No model can supply a command, suite, path,
// approval identity, required-check result or operational state transition.
export class QaWorkflow{
 readonly store:QaStore;private readonly runner:QaRunner;
 constructor(store:QaStore,runner:QaRunner){this.store=store;this.runner=runner;}
 private async target(){if(await this.runner.currentSha()!==this.store.sha)throw fail();}
 private async load(c:PoolClient,id:string){const r=await c.query('SELECT * FROM qa_workflows WHERE run_id=$1',[id]);if(!r.rowCount)return null;let w:z.infer<typeof Workflow>;try{w=Workflow.parse(r.rows[0].workflow);}catch{throw fail();}if(w.runId!==id||!this.store.validMac(w,r.rows[0].workflow_mac))throw fail();return w;}
 private async save(c:PoolClient,state:QaState,w:z.infer<typeof Workflow>,key:string,requestHash:string){
  if(state.revision>=32)throw fail();await c.query('INSERT INTO qa_workflows VALUES($1,$2,$3) ON CONFLICT(run_id) DO UPDATE SET workflow=excluded.workflow,workflow_mac=excluded.workflow_mac',[state.id,w,this.store.mac(w)]);
  const next={...state,revision:state.revision+1};await this.store.append(c,next,key,requestHash,'workflow');return next;
 }
 private async receipt(c:PoolClient,id:string){const r=await c.query('SELECT * FROM qa_checks WHERE run_id=$1',[id]);if(!r.rowCount)throw fail();let receipt:QaReceipt;try{receipt=QaReceipt.parse(r.rows[0].receipt);}catch{throw fail();}if(!this.store.validMac(receipt,r.rows[0].receipt_mac)||receipt.sha!==this.store.sha||new Set(receipt.checks.map(x=>x.name)).size!==4||!receipt.checks.every(x=>x.passed))throw fail();return receipt;}
 private action(state:QaState,receiptHash:string){return hash(JSON.stringify({action:'store_reviewed_qa_report',runId:state.id,workspaceId:state.workspaceId,ownerId:state.ownerId,sha:state.sha,contextHash:state.contextHash,receiptHash}));}
 async read(identity:QaIdentity,id:string){return this.store.transaction(identity,async c=>{
  const state=await this.store.locked(c,identity,id),workflow=await this.load(c,id);const rows=await c.query('SELECT report,report_mac FROM qa_reports WHERE run_id=$1',[id]);let report:unknown=null;
  if(rows.rowCount){report=Report.parse(rows.rows[0].report);if(!this.store.validMac(report,rows.rows[0].report_mac))throw fail();}
  const rs=await c.query('SELECT receipt,receipt_mac FROM qa_checks WHERE run_id=$1',[id]);let checks:QaReceipt|null=null;if(rs.rowCount){checks=QaReceipt.parse(rs.rows[0].receipt);if(!this.store.validMac(checks,rs.rows[0].receipt_mac))throw fail();}
  const as=await c.query('SELECT approval,approval_mac FROM qa_approvals WHERE run_id=$1',[id]);let approval:z.infer<typeof Approval>|null=null;if(as.rowCount){approval=Approval.parse(as.rows[0].approval);if(!this.store.validMac(approval,as.rows[0].approval_mac))throw fail();}
  return {state,workflow,report,checks,approval,sources:this.store.sources,history:await this.store.history(c,state),memory:await this.store.memory(c,state)};
 });}
 async checks(identity:QaIdentity,id:string){
  await this.target();
  const claim=await this.store.transaction(identity,async c=>{const state=await this.store.locked(c,identity,id);if(state.status!=='context_ready')throw fail();const old=await this.load(c,id);
   if(old&&old.stage!=='checks_pending')return null;if(old&&old.leaseUntil>Date.now())throw fail();
   if(old&&old.attempts>=2){await this.save(c,state,{...old,stage:'blocked'},randomUUID(),hash('attempt_budget'));return null;}
   const w=zParseWorkflow({version:'qa-workflow-v1',runId:id,stage:'checks_pending',attempts:(old?.attempts??0)+1,leaseId:randomUUID(),leaseUntil:Date.now()+30000,receiptHash:null,approvalId:null,actionHash:null});await this.save(c,state,w,randomUUID(),hash(w.leaseId));return w;
  });
  if(!claim)return this.read(identity,id);
  let receipt:QaReceipt|null=null;const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),Math.max(1,claim.leaseUntil-Date.now()));
  try{receipt=QaReceipt.parse(await Promise.race([this.runner.run(this.store.sha,abort.signal),new Promise<never>((_,reject)=>abort.signal.addEventListener('abort',()=>reject(fail()),{once:true}))]));await this.target();}catch{receipt=null;}finally{clearTimeout(timer);}
  await this.store.transaction(identity,async c=>{const state=await this.store.locked(c,identity,id),w=await this.load(c,id);if(!w||w.leaseId!==claim.leaseId||w.stage!=='checks_pending'||w.leaseUntil<=Date.now())throw fail();
   if(!receipt||receipt.sha!==state.sha||new Set(receipt.checks.map(x=>x.name)).size!==4){await this.save(c,state,{...w,stage:'blocked'},randomUUID(),hash('required_checks_failed'));return;}
   const receiptHash=hash(JSON.stringify(receipt));await c.query('INSERT INTO qa_checks VALUES($1,$2,$3)',[id,receipt,this.store.mac(receipt)]);
   await this.target();
   if(!receipt.checks.every(x=>x.passed)){await this.save(c,state,{...w,stage:'blocked',receiptHash},randomUUID(),hash('required_checks_failed'));return;}
   await this.save(c,state,{...w,stage:'awaiting_review',receiptHash,actionHash:this.action(state,receiptHash)},randomUUID(),receiptHash);
  });return this.read(identity,id);
 }
 async decide(identity:QaIdentity,id:string,input:unknown){const body=QaDecision.parse(input);await this.target();
  return this.store.transaction(identity,async(c,role)=>{if(!['lead','admin'].includes(role))throw fail();const state=await this.store.locked(c,identity,id),w=await this.load(c,id);
   if(!w||w.stage!=='awaiting_review'||state.revision!==body.expectedRevision||body.sha!==state.sha||body.actionHash!==w.actionHash||!w.receiptHash)throw fail();const receipt=await this.receipt(c,id);if(hash(JSON.stringify(receipt))!==w.receiptHash||this.action(state,w.receiptHash)!==body.actionHash)throw fail();
   // Latest authoritative SHA and membership are checked within the committing
   // transaction. Approval cannot override a failed receipt or change its action.
   await this.target();if(state.expiresAt<=Date.now())throw fail();const approval=Approval.parse({id:randomUUID(),runId:id,workspaceId:state.workspaceId,ownerId:state.ownerId,reviewerId:identity.userId,sha:state.sha,action:'store_reviewed_qa_report',actionHash:body.actionHash,receiptHash:w.receiptHash,contextHash:state.contextHash,expiresAt:Math.min(state.expiresAt,Date.now()+body.ttlSeconds*1000),decision:body.decision,operationalAuthority:false});
   await c.query('INSERT INTO qa_approvals VALUES($1,$2,$3,$4)',[approval.id,id,approval,this.store.mac(approval)]);
   const next=await this.save(c,state,{...w,stage:body.decision==='approve'?'approved':'denied',approvalId:approval.id},body.key,hash(JSON.stringify(body)));return {state:next,approval};
  });
 }
 async consume(identity:QaIdentity,id:string,input:unknown,delegationExpiresAt?:number){const body=QaConsume.parse(input);if(delegationExpiresAt!==undefined)z.number().int().positive().parse(delegationExpiresAt);await this.target();
  return this.store.transaction(identity,async(c,role)=>{if(!['lead','admin'].includes(role))throw fail();const state=await this.store.locked(c,identity,id),w=await this.load(c,id);
   if(!w||w.stage!=='approved'||state.revision!==body.expectedRevision||body.approvalId!==w.approvalId||body.sha!==state.sha||body.actionHash!==w.actionHash)throw fail();
   const a=await c.query('SELECT * FROM qa_approvals WHERE id=$1 AND run_id=$2',[body.approvalId,id]);if(!a.rowCount)throw fail();const approval=Approval.parse(a.rows[0].approval);
   if(!this.store.validMac(approval,a.rows[0].approval_mac)||approval.decision!=='approve'||approval.reviewerId!==identity.userId||approval.workspaceId!==state.workspaceId||approval.ownerId!==state.ownerId||approval.sha!==body.sha||approval.actionHash!==body.actionHash||approval.contextHash!==state.contextHash||approval.receiptHash!==w.receiptHash||approval.expiresAt<=Date.now())throw fail();
   const receipt=await this.receipt(c,id);if(hash(JSON.stringify(receipt))!==approval.receiptHash||this.action(state,approval.receiptHash)!==approval.actionHash)throw fail();await this.target();
   const effectDeadline=Math.min(approval.expiresAt,delegationExpiresAt??Number.MAX_SAFE_INTEGER);
   if(effectDeadline<=Date.now()||state.expiresAt<=Date.now())throw fail();
   const report=Report.parse({version:'qa-report-v1',runId:id,testedSha:state.sha,receiptHash:approval.receiptHash,checks:receipt.checks,scope:receipt.scope,reviewerId:identity.userId,approvalId:approval.id,qualityVerified:false,operationalAuthority:false,releaseAuthority:false});
   // Enforce expiry at the DB write, too: no asynchronous target check or
   // queued statement can consume an approval that elapsed after parsing.
   const written=await c.query('INSERT INTO qa_reports(run_id,approval_id,report,report_mac) SELECT $1,$2,$3::jsonb,$4 WHERE clock_timestamp() < to_timestamp($5::double precision/1000) AND clock_timestamp() < to_timestamp($6::double precision/1000)',[id,approval.id,report,this.store.mac(report),effectDeadline,state.expiresAt]);if(written.rowCount!==1)throw fail();
   const next=await this.save(c,state,{...w,stage:'complete'},body.key,hash(JSON.stringify(body)));return {state:next,report};
  });
 }
}
function zParseWorkflow(input:unknown){return Workflow.parse(input);}
