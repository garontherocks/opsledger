import {z} from 'zod';
const text=(min:number,max:number)=>z.string().trim().refine(x=>[...x].length>=min&&[...x].length<=max,'Invalid character length');
const revision={expectedRevision:z.number().int().min(1).max(2147483646)};
export const Action=z.discriminatedUnion('action',[
 z.strictObject({...revision,action:z.literal('triage'),assigneeId:z.string().min(1).max(128)}),
 z.strictObject({...revision,action:z.literal('assign'),assigneeId:z.string().min(1).max(128)}),
 z.strictObject({...revision,action:z.literal('investigate')}),
 z.strictObject({...revision,action:z.literal('resolve'),resolutionSummary:text(10,5000)}),
 z.strictObject({...revision,action:z.literal('close')}),
 z.strictObject({...revision,action:z.literal('reopen'),reason:text(10,5000),assigneeId:z.string().min(1).max(128).optional()}),
 z.strictObject({...revision,action:z.literal('comment'),body:text(1,5000)}),
]);
export type IncidentAction=z.infer<typeof Action>;
export const HistoryQuery=z.strictObject({beforeRevision:z.coerce.number().int().min(1).optional(),pageSize:z.coerce.number().int().min(1).max(100).default(50)});
export const Activity=z.strictObject({id:z.uuid(),revision:z.number().int(),actorId:z.string(),kind:z.string(),fromState:z.string(),toState:z.string(),note:z.string().nullable(),assigneeId:z.string().nullable(),createdAt:z.iso.datetime()});
