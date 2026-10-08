import {createHmac,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import type {Pool} from 'pg';
import {QualityFeedback} from '../../../packages/contracts/src/feedback.ts';
import {HttpError} from './errors.ts';
const Receipt=z.strictObject({runId:z.uuid(),workspace:z.uuid(),user:z.string().max(200),promptVersion:z.string().max(80),contextHash:z.string().length(64),modelDigest:z.string().max(80),expires:z.number().int()});
export class Feedback{
 private pool:Pool;private secret:string;
 constructor(pool:Pool,secret:string){this.pool=pool;this.secret=secret;}
 private sign(payload:string){return createHmac('sha256',this.secret).update('ai-feedback-v1:'+payload).digest('base64url');}
 issue(user:string,workspace:string,run:{runId:string,promptVersion:string,contextHash:string,digest:string}){const value=Receipt.parse({user,workspace,runId:run.runId,promptVersion:run.promptVersion,contextHash:run.contextHash,modelDigest:run.digest,expires:Date.now()+86400000});const payload=Buffer.from(JSON.stringify(value)).toString('base64url');return payload+'.'+this.sign(payload);}
 async record(user:string,workspace:string,input:z.infer<typeof QualityFeedback>){
  let receipt:z.infer<typeof Receipt>;try{const [payload,sig,...extra]=input.token.split('.');if(!payload||!sig||extra.length)throw new Error();const a=Buffer.from(sig),b=Buffer.from(this.sign(payload));if(a.length!==b.length||!timingSafeEqual(a,b))throw new Error();receipt=Receipt.parse(JSON.parse(Buffer.from(payload,'base64url').toString()));if(receipt.user!==user||receipt.workspace!==workspace||receipt.expires<Date.now())throw new Error();}catch{throw new HttpError(403,'feedback_receipt_invalid','Feedback receipt invalid or expired');}
  const client=await this.pool.connect();try{await client.query('BEGIN');const membership=await client.query('SELECT user_id FROM memberships WHERE user_id=$1 AND workspace_id=$2 AND active=true FOR SHARE',[user,workspace]);if(!membership.rowCount)throw new HttpError(404,'not_found','Resource not found');const inserted=await client.query('INSERT INTO ai_feedback(run_id,workspace_id,user_id,decision,reason,prompt_version,context_hash,model_digest) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(run_id) DO NOTHING',[receipt.runId,workspace,user,input.decision,input.reason,receipt.promptVersion,receipt.contextHash,receipt.modelDigest]);if(!inserted.rowCount)throw new HttpError(409,'feedback_already_recorded','Feedback already recorded');await client.query('COMMIT');return {recorded:true,runId:receipt.runId,changesIncident:false};}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }
}
