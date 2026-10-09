import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {createMcpHandler,requireBearerAuth,OAuthError,type AuthInfo} from '@modelcontextprotocol/server';
import {toNodeHandler} from '@modelcontextprotocol/node';
import {qaMcpServer} from './qa-mcp.ts';
import {hash,registry} from './qa-agent.ts';
import {allowLabPort,disallowLabPort} from '../../../scripts/m3-egress.ts';

export async function startQaHttp(input:unknown){
 const approved=registry(input); // Copy/freeze before opening any listener.
 const grants=new Map<string,AuthInfo>();
 const nonces=new Map<string,number>();
 const handler=createMcpHandler(()=>qaMcpServer(approved.manifest),{maxRequestBodySize:16384});
 const node=toNodeHandler({fetch:async(request)=>{
  if(request.headers.get('host')!==endpoint.host)return new Response('host_denied',{status:403});
  const origin=request.headers.get('origin');
  if(origin!==null&&origin!==endpoint.origin)return new Response('origin_denied',{status:403});
  if(new URL(request.url).pathname!=='/mcp')return new Response('not_found',{status:404});
  if(request.method!=='POST')return new Response('method_denied',{status:405});
  const gate=requireBearerAuth({verifier:{verifyAccessToken:async(token:string)=>{
   const grant=grants.get(hash(token));
   if(!grant)throw new OAuthError('invalid_token','Rejected local lab grant');
   return {...grant};
  }},expectedResource:endpoint,requiredScopes:['qa:read']});
  const auth=await gate(request);if(auth instanceof Response)return auth;
  const now=Date.now();for(const [nonce,expires] of nonces)if(expires<=now)nonces.delete(nonce);
  const nonce=request.headers.get('x-qa-request-id');
  if(!nonce||!/^[a-f0-9-]{36}$/.test(nonce))return new Response('request_id_required',{status:400});
  if(nonces.has(nonce))return new Response('request_replay_denied',{status:409});
  if(nonces.size>=512)return new Response('request_capacity',{status:429});
  nonces.set(nonce,now+300000);
  return handler.fetch(request,{authInfo:auth});
 }},{maxRequestBodySize:16384,onerror:()=>console.error('QA HTTP adapter error (no payload logged)')});
 const server=createServer((req,res)=>{if(!req.method||!req.url){res.writeHead(400);res.end();return;}void node(Object.assign(req,{method:req.method,url:req.url}),res);});
 server.requestTimeout=5000;server.headersTimeout=5000;server.keepAliveTimeout=1000;server.maxConnections=8;
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const address=server.address();if(!address||typeof address==='string')throw new Error('local_listener');
 const endpoint=new URL('http://127.0.0.1:'+address.port+'/mcp');
 allowLabPort(address.port);
 return {endpoint:new URL(endpoint.href),server,
  // Trusted in-process lab operator only. No HTTP mint route or OAuth AS.
  mint(options:{audience?:string,scopes?:string[],expiresAt?:number}={}){
   for(const [key,g] of grants)if((g.expiresAt??0)*1000<=Date.now())grants.delete(key);
   if(grants.size>=16)throw new Error('grant_capacity');
   const token=randomBytes(32).toString('hex');grants.set(hash(token),{token,clientId:'owned-lab-host',scopes:options.scopes??['qa:read'],expiresAt:options.expiresAt??Math.floor(Date.now()/1000)+60,resource:new URL(options.audience??endpoint.href)});return token;
  },
  revoke(token:string){grants.delete(hash(token));},
  async close(){grants.clear();nonces.clear();disallowLabPort(address.port);server.closeAllConnections();try{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}finally{await handler.close();}}
 };
}
