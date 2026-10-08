import {z} from 'zod';
// HTTP transport metadata, not a structured-output contract imposed on the model (Phase 7).
export const SummaryRequest=z.strictObject({expectedRevision:z.number().int().min(1)});
export const SummaryDraft=z.strictObject({
 runId:z.uuid(),requestId:z.uuid(),incidentId:z.uuid(),revision:z.number().int().min(1),promptVersion:z.string(),promptHash:z.string().length(64),contextHash:z.string().length(64),eventIds:z.array(z.uuid()).max(20),
 omittedOlderEvents:z.boolean(),notesTruncated:z.boolean(),reviewRequired:z.literal(true),text:z.string().min(1).max(8000),model:z.string(),digest:z.string(),runtime:z.string(),promptTokens:z.number().int().nonnegative().nullable(),outputTokens:z.number().int().nonnegative().nullable(),latencyMs:z.number().nonnegative(),truncated:z.boolean(),
});
export type SummaryDTO=z.infer<typeof SummaryDraft>;
