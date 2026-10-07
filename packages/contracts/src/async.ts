import {z} from 'zod';
export const RequestKey=z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/);
export const ExportRequest=z.strictObject({requestKey:RequestKey,expectedRevision:z.number().int().positive()});
export const UploadRequest=z.strictObject({requestKey:RequestKey,filename:z.string().max(80).regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,70}\.txt$/).refine(name=>! /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])\./i.test(name)),mime:z.literal('text/plain'),base64:z.string().min(4).max(21848).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/)});
export const FileParams=z.strictObject({workspaceId:z.uuid(),fileId:z.uuid()});
export const OperationParams=z.strictObject({workspaceId:z.uuid(),operationId:z.uuid()});
export const NotificationParams=z.strictObject({workspaceId:z.uuid(),notificationId:z.uuid()});
export const BoundedPage=z.strictObject({pageSize:z.coerce.number().int().min(1).max(50).default(20),before:z.uuid().optional()});
export const OperationList=BoundedPage.extend({incidentId:z.uuid().optional()});
export const JobData=z.strictObject({operationId:z.uuid()});
export function decodeText(raw:string){
 const bytes=Buffer.from(raw,'base64');
 if(!bytes.length||bytes.length>16384||bytes.toString('base64')!==raw)throw new Error('Invalid bounded base64');
 const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 if(text.includes('\0'))throw new Error('NUL is not allowed');return bytes;
}
