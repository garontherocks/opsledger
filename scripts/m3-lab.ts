import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {hash,runAgent,type Manifest,type AgentContext} from '../apps/api/src/qa-agent.ts';
import {skillCatalog,skillReference,TRIAGE_PROMPT} from '../apps/api/src/qa-skill.ts';
import {verifyMcpResult,discoverOwned} from './qa-mcp-host.ts';
import type {TextProvider} from '../apps/api/src/local-model.ts';

export async function labInputs(){
 const data=JSON.parse(await readFile(new URL('../tests/fixtures/phase11-agent-v1.json',import.meta.url),'utf8')) as {manifest:Manifest,cases:{id:string,proposals:unknown[]}[]};
 const skill=await readFile(new URL('../skills/opsledger-triage/SKILL.md',import.meta.url),'utf8');
 const reference=await readFile(new URL('../skills/opsledger-triage/references/triage-checks.md',import.meta.url),'utf8');
 return {manifest:{...data.manifest,sources:data.manifest.sources.map(s=>({...s,sha256:hash(s.text)}))},skill,reference,cases:data.cases};
}
export async function connectQaHttp(endpoint:URL,token:string,era:'modern'|'legacy'='modern'){
 if(endpoint.protocol!=='http:'||endpoint.hostname!=='127.0.0.1'||endpoint.pathname!=='/mcp'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash)throw new Error('http_endpoint_scope');
 const expected=endpoint.href;
 const client=new Client({name:'owned-m3-lab-host',version:'1.0.0'},{versionNegotiation:{mode:era==='modern'?{pin:'2026-07-28'}:'legacy'}});
 const transport=new StreamableHTTPClientTransport(endpoint,{fetch:async(input,init)=>{
  const url=String(input);
  if(url!==expected)throw new Error('http_redirect_scope');
  const headers=new Headers(init?.headers);headers.set('Authorization','Bearer '+token);headers.set('Origin',endpoint.origin);headers.set('X-QA-Request-Id',randomUUID());
  return fetch(input,{...init,headers,redirect:'error'});
 }});
 try{await client.connect(transport,{timeout:5000});await discoverOwned(client);}catch(error){await transport.close();throw error;}
 return {client,close:()=>client.close()};
}
export async function prepareProcedure(client:Client,skill:string,reference:string){
 const catalog=skillCatalog(skill);const body=catalog.load('triage')!;
 const prompt=await client.getPrompt({name:'triage_snapshot'},{timeout:5000});
 if(prompt.messages.length!==1||prompt.messages[0]?.role!=='user'||prompt.messages[0].content.type!=='text'||prompt.messages[0].content.text!==TRIAGE_PROMPT)throw new Error('unreviewed_mcp_prompt');
 return {catalog:{name:catalog.name,description:catalog.description,digest:catalog.digest,authority:false},procedure:body+'\n'+skillReference(reference,true)+'\n'+TRIAGE_PROMPT};
}
export function mcpReader(client:Client,manifest:Manifest):NonNullable<AgentContext['reader']>{return {read:async(name,args,signal)=>verifyMcpResult(manifest,name,args,await client.callTool({name,arguments:args},{timeout:5000,signal}))};}
export async function runMcpAgent(client:Client,inputs:Awaited<ReturnType<typeof labInputs>>,provider:TextProvider,deadlineMs=10000){
 const context=await prepareProcedure(client,inputs.skill,inputs.reference);
 return {context,result:await runAgent(inputs.manifest,provider,{deadlineMs},{procedure:context.procedure,reader:mcpReader(client,inputs.manifest)})};
}
