import {z} from 'zod';
import type {Settings} from './config.ts';
import {HttpError} from './errors.ts';
export const DIMENSIONS=768;
export function vectorValue(value:unknown):number[]{const v=z.array(z.number().finite()).length(DIMENSIONS).parse(value);const norm=Math.hypot(...v);if(norm<1e-8||norm>1e8)throw new HttpError(503,'embedding_invalid','Invalid embedding norm');return v.map(n=>n/norm);}
export interface EmbeddingProvider{model:string;digest:string;embed(inputs:string[],purpose:'document'|'query'):Promise<number[][]>}
export class OllamaEmbeddings implements EmbeddingProvider{
 model:string;digest:string;private active=false;private settings:Settings;
 constructor(settings:Settings){this.settings=settings;this.model=settings.EMBEDDING_MODEL;this.digest=settings.EMBEDDING_DIGEST??'';}
 async embed(inputs:string[],purpose:'document'|'query'){
  if(!inputs.length||inputs.length>4||inputs.some(s=>!s.length||s.length>1200))throw new HttpError(413,'embedding_budget','Embedding input budget exceeded');
  if(this.active)throw new HttpError(429,'embedding_busy','Embedding provider busy');this.active=true;
  const signal=AbortSignal.timeout(this.settings.AI_TIMEOUT_MS);
  const request=async(path:string,body?:unknown)=>{
   const response=await fetch(new URL(path,this.settings.OLLAMA_URL),{method:body?'POST':'GET',redirect:'error',signal,...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});
   if(!response.ok)throw new HttpError(503,'embedding_unavailable','Local embedding unavailable');
   const reader=response.body?.getReader();if(!reader)throw new Error('Missing body');let size=0;const parts:Uint8Array[]=[];
   try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>131072){await reader.cancel();throw new HttpError(503,'embedding_budget','Embedding response too large');}parts.push(part.value);}}finally{reader.releaseLock();}
   return JSON.parse(Buffer.concat(parts).toString('utf8')) as unknown;
  };
  try{
   const tags=z.object({models:z.array(z.object({name:z.string(),digest:z.string()})).max(100)}).parse(await request('/api/tags'));
   const manifest=tags.models.find(m=>m.name===this.model);if(!manifest||(manifest.digest.startsWith('sha256:')?manifest.digest:'sha256:'+manifest.digest)!==this.digest)throw new HttpError(503,'embedding_manifest','Pinned embedding model unavailable');
   const prefix=purpose==='query'?'task: search result | query: ':'title: runbook | text: ';
   const result=z.object({model:z.string(),embeddings:z.array(z.array(z.number().finite())).max(4)}).parse(await request('/api/embed',{model:this.model,input:inputs.map(s=>prefix+s),truncate:false,dimensions:DIMENSIONS,keep_alive:0,options:{num_ctx:2048}}));
   if(result.model!==this.model||result.embeddings.length!==inputs.length)throw new HttpError(503,'embedding_invalid','Embedding identity/count mismatch');return result.embeddings.map(vectorValue);
  }catch(error){if(error instanceof HttpError)throw error;throw new HttpError(503,signal.aborted?'embedding_timeout':'embedding_unavailable','Local embedding unavailable');}finally{this.active=false;}
 }
}
