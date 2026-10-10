import {z} from 'zod';
import {hash} from './qa-agent.ts';
import {QA_SHA} from './qa-state.ts';
import {QA_CHECKS,QaReceipt,type QaRunner} from './qa-workflow.ts';
import {SpecialistContext,validatedSpecialistContext,specialistExperiment,type SpecialistContext as Context} from './qa-specialists.ts';
import type {TextProvider} from './local-model.ts';
export const ADDITIONAL_SUITES=['lifecycle_overlap','orchestration_boundary','specialist_boundary'] as const;
const Change=z.strictObject({sha:QA_SHA,paths:z.array(z.string().min(1).max(200).regex(/^[a-zA-Z0-9_.\/-]+$/).refine(p=>!p.startsWith('/')&&!p.split('/').includes('..'))).min(1).max(64)});
export function planQaChange(input:unknown){const c=Change.parse(input);const paths=[...new Set(c.paths)].sort();const lifecycle=paths.some(p=>/lifecycle|outbox|migrations\//.test(p));const boundary=paths.some(p=>/qa-|auth|config|mcp|n8n/.test(p));const unknown=paths.some(p=>!p.startsWith('docs/')&&!/lifecycle|outbox|migrations\/|qa-|auth|config|mcp|n8n/.test(p));return {sha:c.sha,paths,minimum:[...QA_CHECKS],additional:ADDITIONAL_SUITES.filter(s=>s==='specialist_boundary'||unknown||(s==='lifecycle_overlap'?lifecycle:boundary)),risk:{lifecycle,boundary,unknown},scope:'registered-lab-checks-only' as const};}
export type AdditionalReceipt={sha:string,suite:typeof ADDITIONAL_SUITES[number],passed:boolean,outputHash:string};
export interface PipelineRunner extends QaRunner{additional(suite:typeof ADDITIONAL_SUITES[number],sha:string,signal:AbortSignal):Promise<AdditionalReceipt>}
export async function boundedQaPipeline(change:unknown,input:Context,runner:PipelineRunner,provider:TextProvider){
 const context=SpecialistContext.parse(input),plan=planQaChange(change);if(plan.sha!==context.sha)throw new Error('pipeline_sha_mismatch');
 const started=Date.now(),signal=AbortSignal.timeout(120000),trace:string[]=['risk','suites'];const additional:AdditionalReceipt[]=[];let receipt:QaReceipt|null=null;let triage:Awaited<ReturnType<typeof specialistExperiment>>|null=null;
 const base={version:'qa-pipeline-v1',runId:context.runId,workspaceId:context.workspaceId,userId:context.userId,sha:plan.sha,expiresAt:context.expiresAt,plan,semanticQualityVerified:false as const,operationalAuthority:false as const,releaseAuthority:false as const};
 const finish=(status:'blocked'|'inconclusive'|'awaiting_human_review',reason:string)=>{const report={...base,status,reason,receipt,additional,triage,trace:[...trace],elapsedMs:Date.now()-started};return {...report,reportHash:hash(JSON.stringify(report))};};
 try{
  validatedSpecialistContext(context);
  if(context.expiresAt<=Date.now()||await runner.currentSha()!==plan.sha)throw new Error('stale_checkout_or_context');
  trace.push('execution');receipt=QaReceipt.parse(await runner.run(plan.sha,signal));
  if(receipt.sha!==plan.sha||new Set(receipt.checks.map(c=>c.name)).size!==QA_CHECKS.length)throw new Error('receipt_binding');
  if(!receipt.checks.every(c=>c.passed))return finish('blocked','minimum_required_check_failed');
  for(const suite of plan.additional){const r=z.strictObject({sha:QA_SHA,suite:z.enum(ADDITIONAL_SUITES),passed:z.boolean(),outputHash:z.string().regex(/^[a-f0-9]{64}$/)}).parse(await runner.additional(suite,plan.sha,signal));if(r.sha!==plan.sha||r.suite!==suite)throw new Error('additional_receipt_binding');additional.push(r);if(!r.passed)return finish('blocked','additional_required_check_failed');}
  if(signal.aborted||context.expiresAt<=Date.now()||await runner.currentSha()!==plan.sha)throw new Error('late_checkout_or_context');
  trace.push('triage');triage=await specialistExperiment({...context,receipt},provider,'single');trace.push('eval');
  if(triage.status==='inconclusive'||triage.status==='blocked')return finish('inconclusive','model_or_context_inconclusive');
  // Strict schema/provenance is a mechanical eval, not a semantic pass verdict.
  if(context.expiresAt<=Date.now()||await runner.currentSha()!==plan.sha)throw new Error('review_checkout_or_context');
  trace.push('human_review');return finish('awaiting_human_review','unverified_draft_requires_human_review');
 }catch{return finish('inconclusive','environment_receipt_or_checkout_failure');}
}
export type PipelineReport=Awaited<ReturnType<typeof boundedQaPipeline>>;
// Records a review of this artifact only. No approval token, DB effect or authority.
// Caller identity and current checkout must come from a trusted parent, not a model.
export function reviewPipelineArtifact(report:PipelineReport,input:unknown,currentSha:string,identity:{workspaceId:string,userId:string}){
 const r=z.strictObject({reportHash:z.string().regex(/^[a-f0-9]{64}$/),sha:QA_SHA,decision:z.enum(['accept','edit','reject'])}).parse(input);const {reportHash,...payload}=report;
 if(reportHash!==hash(JSON.stringify(payload))||r.reportHash!==reportHash||report.status!=='awaiting_human_review'||report.sha!==r.sha||currentSha!==report.sha||report.workspaceId!==identity.workspaceId||report.userId!==identity.userId||report.expiresAt<=Date.now()||!report.receipt?.checks.every(c=>c.passed)||report.additional.length!==report.plan.additional.length||!report.additional.every(c=>c.passed))throw new Error('pipeline_review_denied');
 return {version:'qa-pipeline-review-v1',reportHash,sha:report.sha,workspaceId:identity.workspaceId,reviewerId:identity.userId,decision:r.decision,reviewedAt:Date.now(),scope:'artifact-review-only',semanticQualityVerified:false,operationalAuthority:false,releaseAuthority:false};
}
