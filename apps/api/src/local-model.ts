import {z} from 'zod';
import type {Settings} from './config.ts';
import {HttpError} from './errors.ts';
export type Generation={text:string,model:string,digest:string,runtime:string,promptTokens:number|null,outputTokens:number|null,latencyMs:number,truncated:boolean};
export interface TextProvider{generate(prompt:string,format?:Record<string,unknown>):Promise<Generation>}
export class OllamaProvider implements TextProvider{
 private settings:Settings;
 constructor(settings:Settings){this.settings=settings;}
 async generate(prompt:string,format?:Record<string,unknown>):Promise<Generation>{
  if(prompt.length>12000)throw new HttpError(413,'ai_input_budget','Summary input budget exceeded');
  const started=performance.now(),signal=AbortSignal.timeout(this.settings.AI_TIMEOUT_MS);
  const request=async(path:string,body?:unknown)=>{
   const response=await fetch(new URL(path,this.settings.OLLAMA_URL),{method:body?'POST':'GET',redirect:'error',signal,...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});
   if(!response.ok)throw new HttpError(503,'model_unavailable','Local model unavailable');
   const reader=response.body?.getReader();if(!reader)throw new HttpError(503,'model_invalid','Invalid local response');
   const parts:Uint8Array[]=[];let size=0;
   try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>32768){await reader.cancel();throw new HttpError(503,'model_output_budget','Local response too large');}parts.push(part.value);}}
   finally{reader.releaseLock();}
   return JSON.parse(Buffer.concat(parts).toString('utf8')) as unknown;
  };
  try{
   const version=z.object({version:z.string().min(1).max(40)}).parse(await request('/api/version'));
   const tags=z.object({models:z.array(z.object({name:z.string(),digest:z.string(),details:z.object({format:z.string()})})).max(100)}).parse(await request('/api/tags'));
   const model=tags.models.find(item=>item.name===this.settings.OLLAMA_MODEL);
   if(model&&!model.digest.startsWith('sha256:'))model.digest='sha256:'+model.digest;
   if(!model||model.digest!==this.settings.OLLAMA_DIGEST||model.details.format!=='gguf')throw new HttpError(503,'model_manifest_mismatch','Pinned local model unavailable');
   const output=z.object({model:z.string(),response:z.string().trim().min(1).max(8000),done:z.literal(true),done_reason:z.string().optional(),prompt_eval_count:z.number().int().nonnegative().optional(),eval_count:z.number().int().nonnegative().optional()}).parse(await request('/api/generate',{
    model:this.settings.OLLAMA_MODEL,prompt,...(format?{format}:{}),stream:false,think:false,keep_alive:0,options:{temperature:0,seed:42,num_ctx:4096,num_predict:format?768:256},
   }));
   if(output.model!==this.settings.OLLAMA_MODEL)throw new HttpError(503,'model_manifest_mismatch','Local model identity changed');
   return {text:output.response,model:model.name,digest:model.digest,runtime:version.version,promptTokens:output.prompt_eval_count??null,outputTokens:output.eval_count??null,latencyMs:performance.now()-started,truncated:output.done_reason==='length'};
  }catch(error){if(error instanceof HttpError)throw error;throw new HttpError(503,signal.aborted?'model_timeout':'model_unavailable','Local assistance unavailable; incident workflows remain available');}
 }
}
