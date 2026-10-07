import { z } from 'zod';
const boundedText = (min: number, max: number) => z.string().trim().refine(value => [...value].length >= min && [...value].length <= max, 'Invalid character length');
export const CreateIncident = z.strictObject({
  title: boundedText(5, 120), description: boundedText(10, 5000),
  serviceId: z.uuid(), severity: z.enum(['low','medium','high','critical']),
});
export type NewIncident = z.infer<typeof CreateIncident>;
export const Incident = z.strictObject({
  id:z.uuid(),workspaceId:z.uuid(),serviceId:z.uuid(),reporterId:z.string(),
  title:z.string(),description:z.string(),severity:z.enum(['low','medium','high','critical']),
  state:z.literal('reported'),revision:z.literal(1),createdAt:z.iso.datetime(),updatedAt:z.iso.datetime(),
});
export type IncidentDTO = z.infer<typeof Incident>;
export const ErrorDTO = z.object({error:z.object({code:z.string(),message:z.string(),requestId:z.string()})});
export const ListQuery = z.strictObject({pageSize:z.coerce.number().int().min(1).max(50).default(20),cursor:z.string().max(1000).optional()});
export const Params = z.strictObject({workspaceId:z.uuid()});
export const DetailParams = Params.extend({incidentId:z.uuid()});
