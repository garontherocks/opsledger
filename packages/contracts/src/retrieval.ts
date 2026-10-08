import {z} from 'zod';
export const SemanticQuery=z.strictObject({q:z.string().trim().min(1).max(200),limit:z.coerce.number().int().min(1).max(5).default(5),serviceId:z.uuid().optional(),category:z.enum(['operations','recovery','security']).optional()});
export const IndexRequest=z.strictObject({expectedRevision:z.number().int().positive()});
export const ChunkHit=z.strictObject({chunkId:z.uuid(),runbookId:z.uuid(),version:z.number().int().positive(),title:z.string().max(120),contentHash:z.string().regex(/^[a-f0-9]{64}$/),start:z.number().int().nonnegative(),end:z.number().int().positive(),text:z.string().max(1200),score:z.number().finite(),model:z.string(),digest:z.string(),indexVersion:z.literal('chunk-v1-768')});
export const SemanticResult=z.strictObject({items:z.array(ChunkHit).max(5),mode:z.literal('exact-cosine'),qualityVerified:z.literal(false)});
export type Hit=z.infer<typeof ChunkHit>;
