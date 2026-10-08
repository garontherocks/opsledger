import {z} from 'zod';
// Strict model contracts; schema validity is not a truth guarantee.
const boundedText=(max:number)=>z.string().trim().min(1).max(max);
export const IncidentState=z.enum(['reported','triaged','investigating','resolved','closed']);
export const SummaryContent=z.strictObject({
 status:z.enum(['draft','abstain','refusal']),state:IncidentState,
 summary:boundedText(1200),timeline:z.array(z.strictObject({eventId:z.uuid(),observation:boundedText(300)})).max(20),unknowns:z.array(boundedText(200)).max(8),
});
export const RiskProposal=z.strictObject({
 status:z.enum(['draft','abstain','refusal']),observations:z.array(boundedText(300)).max(8),
 hypotheses:z.array(boundedText(300)).max(8),risks:z.array(boundedText(200)).max(8),
 proposedTests:z.array(z.strictObject({risk:boundedText(200),check:boundedText(300)})).max(8),unknowns:z.array(boundedText(200)).max(8),
});
export const SUMMARY_JSON_SCHEMA=z.toJSONSchema(SummaryContent,{target:'draft-07'});
export const RISK_JSON_SCHEMA=z.toJSONSchema(RiskProposal,{target:'draft-07'});
export type SummaryContentDTO=z.infer<typeof SummaryContent>;
export type RiskProposalDTO=z.infer<typeof RiskProposal>;
export const SummaryRequest=z.strictObject({expectedRevision:z.number().int().min(1)});
export const SummaryDraft=z.strictObject({
 runId:z.uuid(),requestId:z.uuid(),incidentId:z.uuid(),revision:z.number().int().min(1),promptVersion:z.string(),promptHash:z.string().length(64),contextHash:z.string().length(64),eventIds:z.array(z.uuid()).max(20),
 omittedOlderEvents:z.boolean(),notesTruncated:z.boolean(),reviewRequired:z.literal(true),content:SummaryContent,text:z.string().min(1).max(8000),model:z.string(),digest:z.string(),runtime:z.string(),promptTokens:z.number().int().nonnegative().nullable(),outputTokens:z.number().int().nonnegative().nullable(),latencyMs:z.number().nonnegative(),truncated:z.boolean(),
});
export type SummaryDTO=z.infer<typeof SummaryDraft>;
