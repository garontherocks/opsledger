import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import net from 'node:net';
import {Client} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import {connectOwnedQa,connectStdioWithDiagnostics,discoverOwned,verifyMcpResult} from '../scripts/qa-mcp-host.ts';
import {nodeImportSpecifier,summarizeChildStderr} from '../scripts/node-launch.ts';
import {registry,hash,type Manifest} from '../apps/api/src/qa-agent.ts';
const data=JSON.parse(await readFile(new URL('./fixtures/phase11-agent-v1.json',import.meta.url),'utf8')) as {manifest:Manifest};
const manifest={...data.manifest,sources:data.manifest.sources.map(s=>({...s,sha256:hash(s.text)}))};
const guard=nodeImportSpecifier(new URL('../scripts/mcp-egress.mjs',import.meta.url));
test('Node import specifiers preserve Windows drive/UNC, POSIX and escaped paths',()=>{
 for(const href of ['file:///C:/Users/test%20user/guard.mjs','file://server/share/guard.mjs','file:///tmp/test%20user/guard.mjs'])assert.equal(nodeImportSpecifier(new URL(href)),href);
 for(const href of ['https://example.com/guard.mjs','file:///tmp/guard.mjs?extra','file:///tmp/guard.mjs#extra'])assert.throws(()=>nodeImportSpecifier(new URL(href)),/file_url_required/);
});
test('bootstrap failure reports actual child error code, keeps cause and closes child',async()=>{
 const client=new Client({name:'startup-regression',version:'1.0.0'},{versionNegotiation:{mode:{pin:'2026-07-28'}}});
 const args=['--import',nodeImportSpecifier(new URL('./fixtures/nonexistent-preloader.mjs',import.meta.url)),'-e',''];
 const transport=new StdioClientTransport({command:process.execPath,args,stderr:'pipe',env:{}});
 await assert.rejects(connectStdioWithDiagnostics(client,transport,()=>spawnSync(process.execPath,args,{encoding:'utf8',timeout:1500,maxBuffer:8192,windowsHide:true}).stderr??''),(error:unknown)=>{
  assert.ok(error instanceof Error);assert.match(error.message,/bootstrap failed.*ERR_MODULE_NOT_FOUND/);assert.ok(error.cause);assert.doesNotMatch(error.message,/nonexistent-preloader|Users|workspace/);return true;
 });
 assert.equal(transport.pid,null);
 assert.equal(summarizeChildStderr('token=private-value\nERR_UNSUPPORTED_ESM_URL_SCHEME\nOn Windows, absolute paths must be valid file:// URLs. Received protocol c:'),'ERR_UNSUPPORTED_ESM_URL_SCHEME; Windows absolute paths must be valid file:// URLs');
 assert.equal(summarizeChildStderr('secret without a known diagnostic'),'stderr captured; unrecognized content withheld');
});
test('stdio host process denies HTTP and socket egress including loopback',()=>{
 assert.throws(()=>fetch('https://example.com'),/MCP_EGRESS_DENIED/);
 assert.throws(()=>net.connect({host:'127.0.0.1',port:11434}),/MCP_EGRESS_DENIED/);
});

test('real SDK stdio host discovers exact scope; every tool/resource matches direct registry',async()=>{
 for(const era of ['modern','legacy'] as const){
 const host=await connectOwnedQa(era);
 try{
  assert.equal(host.client.getProtocolEra(),era);
  const list=await discoverOwned(host.client);assert.equal(list.tools.length,3);
  const direct=registry(manifest);
  for(const source of manifest.sources){
   const args={id:source.id};
   const result=await host.client.callTool({name:source.tool,arguments:args},{timeout:5000});
   assert.deepEqual(verifyMcpResult(manifest,source.tool,args,result),direct.invoke(source.tool,args));
  }
  const resources=await host.client.listResources({}, {timeout:5000});assert.equal(resources.resources.length,3);
  for(const resource of resources.resources){
   assert.match(resource.uri,/^qa:\/\/snapshot\/qa-readonly-v1\/[a-z-]+\/[a-f0-9]{64}$/);
   const read=await host.client.readResource({uri:resource.uri},{timeout:5000});
   const item=read.contents[0];assert.ok(item&&'text' in item);
   const source=manifest.sources.find(s=>s.id===resource.name)!;
   assert.deepEqual(JSON.parse(item.text),direct.invoke(source.tool,{id:source.id}));
  }
  assert.equal(host.diagnostics(),'stderr captured; unrecognized content withheld');
 }finally{await host.close();}
 assert.equal(host.transport.pid,null);
 }
});
test('SDK denies unknown tools, malformed/extra args, foreign IDs and unlisted resource URIs',async()=>{
 const host=await connectOwnedQa();
 try{
  await discoverOwned(host.client);
  await assert.rejects(host.client.callTool({name:'run_shell',arguments:{id:'change-a'}},{timeout:5000}));
  for(const args of [{id:'contract-a',path:'/etc/passwd'},{id:42},{id:'other-workspace'}]){
   const result=await host.client.callTool({name:'get_contract',arguments:args},{timeout:5000});assert.equal(result.isError,true);
   assert.throws(()=>verifyMcpResult(manifest,'get_contract',args,result));
  }
  await assert.rejects(host.client.readResource({uri:'file:///etc/passwd'},{timeout:5000}));
  await assert.rejects(host.client.readResource({uri:'qa://snapshot/qa-readonly-v1/contract-a/'+'0'.repeat(64)},{timeout:5000}));
  const good=await host.client.callTool({name:'get_contract',arguments:{id:'contract-a'}},{timeout:5000});
  assert.ok(verifyMcpResult(manifest,'get_contract',{id:'contract-a'},good));
 }finally{await host.close();}
});
test('host rejects forged output even with valid-looking schema and real source ID',()=>{
 const output=registry(manifest).invoke('get_contract',{id:'contract-a'});
 const forged={...output,text:'malicious replacement',sha256:hash('malicious replacement')};
 assert.throws(()=>verifyMcpResult(manifest,'get_contract',{id:'contract-a'},{content:[{type:'text',text:JSON.stringify(forged)}],structuredContent:forged}),/integrity/);
 assert.throws(()=>verifyMcpResult(manifest,'get_contract',{id:'contract-a'},{content:[{type:'text',text:JSON.stringify(forged)}],structuredContent:output}),/integrity/);
 assert.throws(()=>verifyMcpResult(manifest,'get_contract',{id:'contract-a'},{content:[],structuredContent:{...output,untrusted:false}}));
});
test('SDK timeout and explicit cancellation reach cooperative fixture; owned child closes',async()=>{
 for(const era of ['modern','legacy'])for(const mode of ['timeout','abort']){
  const client=new Client({name:'test-host',version:'1.0.0'},{versionNegotiation:{mode:era==='modern'?{pin:'2026-07-28'}:'legacy'}});
  const transport=new StdioClientTransport({command:process.execPath,args:['--import',guard,'--experimental-strip-types',fileURLToPath(new URL('./fixtures/mcp-cancellation-server.ts',import.meta.url))],stderr:'pipe',env:{}});
  let stderr='';transport.stderr?.on('data',chunk=>{stderr+=String(chunk);});
  try{
   await client.connect(transport,{timeout:5000});await client.listTools();
   const abort=new AbortController();
   const request=client.callTool({name:'wait',arguments:{}},{timeout:mode==='timeout'?100:5000,signal:abort.signal});
   const rejected=assert.rejects(request);
   if(mode==='abort'){for(let i=0;i<100&&!stderr.includes('started');i++)await new Promise(r=>setTimeout(r,5));assert.match(stderr,/started/);abort.abort();}
   await rejected;
   for(let i=0;i<100&&!stderr.includes('cancelled');i++)await new Promise(r=>setTimeout(r,5));
   assert.match(stderr,/cancelled/);
  }finally{await client.close();}
  assert.equal(transport.pid,null);
 }
});
test('raw JSON-RPC transcript: initialize/discover/call; malformed message keeps stdout protocol clean',async()=>{
 const child=spawn(process.execPath,['--import',guard,'--experimental-strip-types',fileURLToPath(new URL('../scripts/qa-mcp-server.ts',import.meta.url))],{stdio:['pipe','pipe','pipe'],env:{}});
 const transcript:unknown[]=[];let buffer='',stderr='';const messages:Record<string,unknown>[]=[];
 child.stderr.on('data',chunk=>{stderr+=String(chunk);});
 child.stdout.on('data',chunk=>{buffer+=String(chunk);let index;while((index=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,index);buffer=buffer.slice(index+1);try{const m=JSON.parse(line);messages.push(m);transcript.push({direction:'server',message:m});}catch{messages.push({invalidStdout:line});}}});
 const send=(message:unknown)=>{transcript.push({direction:'host',message});child.stdin.write(JSON.stringify(message)+'\n');};
 const receive=async(id:number)=>{for(let i=0;i<1000;i++){assert.equal(messages.some(m=>'invalidStdout' in m),false);const m=messages.find(m=>m.id===id);if(m)return m;await new Promise(r=>setTimeout(r,5));}throw new Error('wire timeout');};
 try{
  send({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'raw-qa-probe',version:'1.0.0'}}});
  const initialized=await receive(1);assert.ok(initialized.result);
  send({jsonrpc:'2.0',method:'notifications/initialized'});
  send({jsonrpc:'2.0',id:2,method:'tools/list',params:{}});assert.ok((await receive(2)).result);
  child.stdin.write('not-json\n');transcript.push({direction:'host',malformed:'not-json'});
  send({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'get_contract',arguments:{id:'contract-a'}}});
  const called=await receive(3);assert.ok(called.result);assert.match(stderr,/synthetic read-only/);
  await mkdir('evidence',{recursive:true});await writeFile('evidence/phase12-protocol-transcript.json',JSON.stringify({syntheticOnly:true,annotation:'Actual child-process JSON-RPC; stderr banner kept outside stdout; malformed line discarded by SDK, valid next call succeeds.',transcript},null,2)+'\n');
 }finally{child.stdin.end();await new Promise<void>(resolve=>{const timer=setTimeout(()=>child.kill('SIGKILL'),2000);child.once('exit',()=>{clearTimeout(timer);resolve();});});}
});
