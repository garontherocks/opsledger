import {readFile} from 'node:fs/promises';
import {serveStdio,StdioServerTransport} from '@modelcontextprotocol/server/stdio';
import {qaMcpServer} from '../apps/api/src/qa-mcp.ts';
import {hash,type Manifest} from '../apps/api/src/qa-agent.ts';
// Fixed reviewed fixture only: no caller/model-selected file or URL.
const data=JSON.parse(await readFile(new URL('../tests/fixtures/phase11-agent-v1.json',import.meta.url),'utf8')) as {manifest:Manifest};
const manifest={...data.manifest,sources:data.manifest.sources.map(s=>({...s,sha256:hash(s.text)}))};
console.error('OpsLedger synthetic read-only MCP stdio server');
serveStdio(()=>qaMcpServer(manifest),{legacy:'serve',transport:new StdioServerTransport(process.stdin,process.stdout,{maxBufferSize:16384}),onerror:()=>console.error('MCP protocol error (no payload logged)')});
