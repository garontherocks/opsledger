import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {OllamaEmbeddings} from '../apps/api/src/embeddings.ts';
import {config} from '../apps/api/src/config.ts';
const model='embeddinggemma:300m',digest='sha256:'+'e'.repeat(64);
test('embedding adapter pins manifest and disables silent input truncation',async()=>{
 let received:Record<string,unknown>|undefined;const server=createServer((req,res)=>{if(req.url==='/api/tags'){res.end(JSON.stringify({models:[{name:model,digest:digest.slice(7)}]}));return;}let text='';req.on('data',b=>text+=b);req.on('end',()=>{received=JSON.parse(text);res.end(JSON.stringify({model,embeddings:[Array.from({length:768},(_,i)=>i===0?1:0)]}));});});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();if(!address||typeof address==='string')throw new Error('Address unavailable');
 const settings=config({NODE_ENV:'test',LAB_MODE:'true',EMBEDDINGS_ENABLED:'true',EMBEDDING_DIGEST:digest,OLLAMA_URL:'http://127.0.0.1:'+address.port,DATABASE_URL:'postgresql://localhost/test',AUTH_SECRET:'x'.repeat(40)});
 try{const adapter=new OllamaEmbeddings(settings);assert.equal((await adapter.embed(['restore backup'],'query'))[0]!.length,768);assert.equal(received?.truncate,false);assert.equal(received?.dimensions,768);assert.deepEqual(received?.input,['task: search result | query: restore backup']);await assert.rejects(new OllamaEmbeddings({...settings,EMBEDDING_DIGEST:'sha256:'+'a'.repeat(64)}).embed(['backup'],'query'),{code:'embedding_manifest'});await assert.rejects(adapter.embed(['x'.repeat(1201)],'document'),{code:'embedding_budget'});}finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});
