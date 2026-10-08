import {Client} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import {fileURLToPath} from 'node:url';
import {z} from 'zod';
import {MCP_OUTPUT} from '../apps/api/src/qa-mcp.ts';
import {registry,hash,TOOL_NAMES} from '../apps/api/src/qa-agent.ts';

export async function connectOwnedQa(era:'modern'|'legacy'='modern'){
 z.enum(['modern','legacy']).parse(era);
 const client=new Client({name:'opsledger-owned-qa-host',version:'1.0.0'},{versionNegotiation:{mode:era==='modern'?{pin:'2026-07-28'}:'legacy'}});
 // Allowlist is executable + one fixed script, never discovered/model-selected commands.
 const transport=new StdioClientTransport({command:process.execPath,args:['--import',fileURLToPath(new URL('./mcp-egress.mjs',import.meta.url)),'--experimental-strip-types',fileURLToPath(new URL('./qa-mcp-server.ts',import.meta.url))],stderr:'pipe',env:{}});
 let diagnostics='';transport.stderr?.on('data',chunk=>{diagnostics=(diagnostics+String(chunk)).slice(-2000);});
 try{await client.connect(transport,{timeout:5000});}
 catch(error){await transport.close();throw error;}
 return {client,transport,diagnostics:()=>diagnostics,close:()=>client.close()};
}
export function verifyMcpResult(input:unknown,name:string,args:unknown,result:unknown){
 const envelope=z.object({isError:z.boolean().optional(),structuredContent:z.unknown(),content:z.array(z.object({type:z.literal('text'),text:z.string().max(12000)})).length(1)}).parse(result);
 if(envelope.isError)throw new Error('mcp_tool_error');
 const output=MCP_OUTPUT.parse(envelope.structuredContent);
 const displayed=MCP_OUTPUT.parse(JSON.parse(envelope.content[0]!.text));
 const expected=registry(input).invoke(name,args);
 if(JSON.stringify(displayed)!==JSON.stringify(output)||output.id!==expected.id||output.text!==expected.text||output.sha256!==expected.sha256||hash(output.text)!==output.sha256)throw new Error('mcp_output_integrity');
 return output;
}
export async function discoverOwned(client:Client){
 const list=await client.listTools({}, {timeout:5000});
 if(list.tools.length!==3||new Set(list.tools.map(t=>t.name)).size!==3||list.tools.some(t=>!TOOL_NAMES.includes(t.name as typeof TOOL_NAMES[number])))throw new Error('mcp_discovery_scope');
 return list;
}
