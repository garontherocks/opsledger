import {McpServer} from '@modelcontextprotocol/server';
import {serveStdio} from '@modelcontextprotocol/server/stdio';
import {z} from 'zod';
// Test-only cooperative slow server; never in the owned QA host allowlist.
function build(){
const server=new McpServer({name:'cancellation-fixture',version:'1.0.0'});
server.registerTool('wait',{inputSchema:z.strictObject({})},async(_args,context)=>{
 console.error('started');
 await new Promise<void>(resolve=>{
  const timer=setTimeout(resolve,1000);
  context.mcpReq.signal.addEventListener('abort',()=>{clearTimeout(timer);console.error('cancelled');resolve();},{once:true});
 });
 return {content:[{type:'text',text:'test-only completion'}]};
});
return server;
}
serveStdio(build);
