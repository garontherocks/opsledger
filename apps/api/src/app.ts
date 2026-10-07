import Fastify, { type FastifyRequest } from 'fastify';
import swagger from '@fastify/swagger';
import staticPlugin from '@fastify/static';
import rateLimit from '@fastify/rate-limit';
import { resolve } from 'node:path';
import { fromNodeHeaders } from 'better-auth/node';
import { z } from 'zod';
import { serializerCompiler,validatorCompiler,jsonSchemaTransform,type ZodTypeProvider } from 'fastify-type-provider-zod';
import type { Settings } from './config.ts';
import { createAuth } from './auth.ts';
import { Store,HttpError } from './store.ts';
import { CreateIncident,Incident,ListQuery,Params,DetailParams } from '../../../packages/contracts/src/incident.ts';

export async function buildApp(store:Store,settings:Settings,serveWeb=false){
  const auth=createAuth(store.pool,settings);
  const app=Fastify({bodyLimit:32768,genReqId:()=>crypto.randomUUID(),logger:settings.NODE_ENV==='test'?false:{
    redact:['req.headers.cookie','req.headers.authorization','res.headers["set-cookie"]'],level:'info'},
  }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);app.setSerializerCompiler(serializerCompiler);
  await app.register(rateLimit,{max:100,timeWindow:'1 minute'});
  await app.register(swagger,{openapi:{openapi:'3.1.0',info:{title:'OpsLedger API',version:'1.0.0'}},transform:jsonSchemaTransform});
  app.addHook('onRequest',async(request,reply)=>{
    reply.header('x-content-type-options','nosniff').header('referrer-policy','same-origin');
    reply.header('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'self'");
    if(!['GET','HEAD','OPTIONS'].includes(request.method)){
      if(request.headers.origin && request.headers.origin!==new URL(settings.BASE_URL).origin)throw new HttpError(403,'forbidden_origin','Origin denied');
      if(request.headers['sec-fetch-site']==='cross-site')throw new HttpError(403,'forbidden_origin','Origin denied');
    }
  });
  app.setErrorHandler((error,request,reply)=>{
    const record=error && typeof error==='object'?error:{};
    const code='code' in record?String(record.code):'';
    const status=error instanceof HttpError?error.status:
      'validation' in record?400:code==='FST_ERR_CTP_BODY_TOO_LARGE'?413:
      'statusCode' in record&&record.statusCode===429?429:
      ['ECONNREFUSED','ETIMEDOUT','57P01','08006'].includes(code)?503:500;
    if(status>=500)request.log.error({code,requestId:request.id},'Request failed');
    reply.code(status).send({error:{code:error instanceof HttpError?error.code:status===400?'validation_error':status===503?'unavailable':status===413?'body_too_large':status===429?'rate_limited':'internal_error',
      message:status>=500?'Service unavailable':error instanceof HttpError?error.message:'Request rejected',requestId:request.id}});
  });
  app.route({method:['GET','POST'],url:'/api/auth/*',async handler(request,reply){
    const headers=fromNodeHeaders(request.headers);
    // Ignore client-supplied forwarding hints. The direct peer is authoritative.
    headers.set('x-opsledger-client-ip',request.ip);
    const response=await auth.handler(new Request(new URL(request.url,settings.BASE_URL),{
      method:request.method,headers,
      ...(request.method==='POST'?{body:JSON.stringify(request.body)}:{}),
    }));
    reply.code(response.status);
    response.headers.forEach((value,key)=>{if(key.toLowerCase()!=='set-cookie')reply.header(key,value);});
    const cookies=response.headers.getSetCookie();if(cookies.length)reply.header('set-cookie',cookies);
    return reply.send(await response.text());
  }});
  async function identity(request:FastifyRequest){
    const session=await auth.api.getSession({headers:fromNodeHeaders(request.headers)});
    if(!session)throw new HttpError(401,'unauthenticated','Sign in required');return session.user;
  }
  app.get('/api/v1/me',async request=>{const user=await identity(request);return {user:{id:user.id,name:user.name,email:user.email},workspaces:await store.me(user.id)};});
  app.get('/api/v1/workspaces/:workspaceId/services',{schema:{params:Params}},async request=>{
    const user=await identity(request);await store.member(user.id,request.params.workspaceId);return store.services(request.params.workspaceId);
  });
  app.post('/api/v1/workspaces/:workspaceId/incidents',{schema:{params:Params,body:CreateIncident,response:{201:Incident}}},async(request,reply)=>{
    const user=await identity(request);await store.member(user.id,request.params.workspaceId);
    const result=await store.create(user.id,request.params.workspaceId,request.body);
    return reply.code(201).header('location','/api/v1/workspaces/'+result.workspaceId+'/incidents/'+result.id).send(result);
  });
  app.get('/api/v1/workspaces/:workspaceId/incidents',{schema:{params:Params,querystring:ListQuery,response:{200:z.object({items:z.array(Incident),nextCursor:z.string().nullable()})}}},async request=>{
    const user=await identity(request);await store.member(user.id,request.params.workspaceId);
    return store.list(user.id,request.params.workspaceId,request.query.pageSize,request.query.cursor);
  });
  app.get('/api/v1/workspaces/:workspaceId/incidents/:incidentId',{schema:{params:DetailParams,response:{200:Incident}}},async request=>{
    const user=await identity(request);await store.member(user.id,request.params.workspaceId);
    return store.detail(request.params.workspaceId,request.params.incidentId);
  });
  app.get('/health/live',async()=>({status:'ok'}));
  app.get('/health/ready',async()=>{await store.pool.query('SELECT 1');return {status:'ready'};});
  if(serveWeb){
    await app.register(staticPlugin,{root:resolve('apps/web/dist'),prefix:'/'});
    app.setNotFoundHandler((request,reply)=>{
      if(request.url.startsWith('/api/')||!['GET','HEAD'].includes(request.method))return reply.code(404).send({error:{code:'not_found',message:'Resource not found',requestId:request.id}});
      return reply.sendFile('index.html');
    });
  }
  return app;
}
