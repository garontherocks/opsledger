import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {OllamaProvider} from '../apps/api/src/local-model.ts';
import {config} from '../apps/api/src/config.ts';
import {redactText} from '../apps/api/src/assistance.ts';
const digest='sha256:'+'a'.repeat(64),model='qwen3:0.6b-q4_K_M';
async function fixture(handler:(req:IncomingMessage,res:ServerResponse)=>void){
 const server=createServer(handler);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw new Error('Missing bound address');
 const settings=config({NODE_ENV:'test',DATABASE_URL:'postgresql://localhost/test',AUTH_SECRET:'secret-is-long-enough-for-test-safety-123',LAB_MODE:'true',AI_ENABLED:'true',OLLAMA_MODEL:model,OLLAMA_DIGEST:digest,OLLAMA_URL:'http://127.0.0.1:'+address.port,AI_TIMEOUT_MS:'100'});
 return {settings,close:async()=>{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}};
}
function metadata(req:IncomingMessage,res:ServerResponse){if(req.url==='/api/version'){res.end(JSON.stringify({version:'fixture-only'}));return true;}if(req.url==='/api/tags'){res.end(JSON.stringify({models:[{name:model,digest:digest.slice(7),details:{format:'gguf'}}]}));return true;}return false;}
test('provider checks local manifest and sends bounded nonstreaming generation',async()=>{
 let body:Record<string,unknown>|undefined;const runtime=await fixture((req,res)=>{if(metadata(req,res))return;let data='';req.on('data',chunk=>data+=chunk);req.on('end',()=>{body=JSON.parse(data);res.end(JSON.stringify({model,response:'Synthetic draft',done:true,done_reason:'length',eval_count:256}));});});
 try{const result=await new OllamaProvider(runtime.settings).generate('Synthetic prompt');assert.equal(result.text,'Synthetic draft');assert.equal(result.digest,digest);assert.equal(result.truncated,true);assert.equal(body?.stream,false);assert.equal(body?.think,false);assert.deepEqual(body?.options,{temperature:0,seed:42,num_ctx:4096,num_predict:256});}finally{await runtime.close();}
});
test('wrong digest fails before generation',async()=>{
 let generated=0;const runtime=await fixture((req,res)=>{if(req.url==='/api/generate')generated++;metadata(req,res);});
 try{await assert.rejects(new OllamaProvider({...runtime.settings,OLLAMA_DIGEST:'sha256:'+'b'.repeat(64)}).generate('Synthetic'),error=>(error as {code:string}).code==='model_manifest_mismatch');assert.equal(generated,0);}finally{await runtime.close();}
});
test('provider deadline cancels a nonresponsive local runtime',async()=>{
 const runtime=await fixture(()=>{});try{await assert.rejects(new OllamaProvider(runtime.settings).generate('Synthetic'),error=>(error as {code:string}).code==='model_timeout');}finally{await runtime.close();}
});
test('oversized output is bounded before JSON parsing',async()=>{
 const runtime=await fixture((req,res)=>{if(metadata(req,res))return;res.end('x'.repeat(40000));});try{await assert.rejects(new OllamaProvider(runtime.settings).generate('Synthetic'),error=>(error as {code:string}).code==='model_output_budget');}finally{await runtime.close();}
});
test('redirects never reach another origin',async()=>{
 let reached=0;const target=await fixture((_req,res)=>{reached++;res.end('{}');});const runtime=await fixture((_req,res)=>{res.writeHead(302,{location:target.settings.OLLAMA_URL});res.end();});
 try{await assert.rejects(new OllamaProvider(runtime.settings).generate('Synthetic'));assert.equal(reached,0);}finally{await runtime.close();await target.close();}
});
test('remote origins, cloud model tags and enabled unpinned production AI are rejected',()=>{
 const base={DATABASE_URL:'postgresql://localhost/test',AUTH_SECRET:'x'.repeat(40)};
 for(const url of ['https://example.com','http://localhost:11434','http://127.0.0.1/path','http://user:pass@127.0.0.1'])assert.throws(()=>config({...base,OLLAMA_URL:url}));
 assert.throws(()=>config({...base,OLLAMA_MODEL:'qwen3:cloud'}));assert.throws(()=>config({...base,AI_ENABLED:'true'}));
});
test('selected credentials are redacted from synthetic free text',()=>{const text=redactText('password=hunter2 api_key=private sk-12345678901234567890 the-runtime-secret','the-runtime-secret');assert.ok(!text.includes('hunter2')&&!text.includes('private')&&!text.includes('123456')&&!text.includes('runtime-secret'));});

test('structured generation sends provider JSON schema with a bounded larger output budget',async()=>{
 let body:Record<string,unknown>|undefined;const runtime=await fixture((req,res)=>{if(metadata(req,res))return;let data='';req.on('data',chunk=>data+=chunk);req.on('end',()=>{body=JSON.parse(data);res.end(JSON.stringify({model,response:'{"status":"refusal"}',done:true}));});});
 const format={type:'object',additionalProperties:false};try{await new OllamaProvider(runtime.settings).generate('Structured prompt',format);assert.deepEqual(body?.format,format);assert.deepEqual(body?.options,{temperature:0,seed:42,num_ctx:4096,num_predict:768});}finally{await runtime.close();}
});
