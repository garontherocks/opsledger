import {z} from 'zod';
import {ChunkHit} from './retrieval.ts';
const Citation=z.strictObject({chunkId:z.uuid(),quote:z.string().min(10).max(300)});
const Claim=z.strictObject({text:z.string().trim().min(1).max(400),citations:z.array(Citation).min(1).max(3)});
export const RagContent=z.strictObject({status:z.enum(['draft','abstain','refusal']),claims:z.array(Claim).max(5),nextSteps:z.array(Claim).max(3),unknowns:z.array(z.string().trim().min(1).max(200)).max(5)});
export const RAG_JSON_SCHEMA=z.toJSONSchema(RagContent,{target:'draft-7'});
export const RagRequest=z.strictObject({question:z.string().trim().min(3).max(300),serviceId:z.uuid().optional(),category:z.enum(['operations','recovery','security']).optional()});
export const RagDraft=z.strictObject({runId:z.uuid(),requestId:z.uuid(),promptVersion:z.string(),promptHash:z.string(),contextHash:z.string(),model:z.string(),digest:z.string(),runtime:z.string(),latencyMs:z.number().nonnegative(),reviewRequired:z.literal(true),qualityVerified:z.literal(false),sources:z.array(ChunkHit).max(3),content:RagContent});
export type RagAnswer=z.infer<typeof RagDraft>;
