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
import {Action,HistoryQuery,Activity} from '../../../packages/contracts/src/lifecycle.ts';
import {Knowledge} from './knowledge.ts';
import {CreateRunbook,NewVersion,PublishAction,RunbookParams,VersionParams,Search,RunbookVersion,AuditQuery} from '../../../packages/contracts/src/knowledge.ts';

import type {AsyncOps} from './async-ops.ts';
import {ExportRequest,UploadRequest,FileParams,OperationParams,NotificationParams,BoundedPage,OperationList} from '../../../packages/contracts/src/async.ts';

export async function buildApp(store:Store,settings:Settings,serveWeb=false,operations?:AsyncOps){
  const auth=createAuth(store.pool,settings);
  const knowledge=new Knowledge(store.pool,settings.AUTH_SECRET);
  const identities=new WeakMap<FastifyRequest,string>();
  const app=Fastify({bodyLimit:32768,genReqId:()=>crypto.randomUUID(),logger:settings.NODE_ENV==='test'?false:{
    redact:['req.headers.cookie','req.headers.authorization','res.headers["set-cookie"]'],level:'info',
    serializers:{req:(request:{method:string,url:string})=>({method:request.method,path:request.url.split('?')[0]?.slice(0,200)})}},
  }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);app.setSerializerCompiler(serializerCompiler);
  await app.register(rateLimit,{max:100,timeWindow:'1 minute'});
  await app.register(swagger,{openapi:{openapi:'3.1.0',info:{title:'OpsLedger API',version:'1.0.0'}},transform:jsonSchemaTransform});
  app.addHook('onRequest',async(request,reply)=>{
    reply.header('x-content-type-options','nosniff').header('referrer-policy','same-origin');
    reply.header('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'self'");
    const path=request.url.split('?')[0]!;
    if(path.startsWith('/api/v1/')){
      reply.header('cache-control','no-store');
      if(settings.READ_ONLY==='true'&&!['GET','HEAD','OPTIONS'].includes(request.method))throw new HttpError(503,'read_only','Maintenance: workspace writes paused');
      if(settings.KNOWLEDGE_ENABLED==='false'&&path.includes('/runbooks'))throw new HttpError(503,'feature_disabled','Knowledge disabled');
    }
    if(!['GET','HEAD','OPTIONS'].includes(request.method)){
      if(request.headers.origin && request.headers.origin!==new URL(settings.BASE_URL).origin)throw new HttpError(403,'forbidden_origin','Origin denied');
      if(request.headers['sec-fetch-site']==='cross-site')throw new HttpError(403,'forbidden_origin','Origin denied');
    }
  });
  app.setErrorHandler(async(error,request,reply)=>{
    const record=error && typeof error==='object'?error:{};
    const code='code' in record?String(record.code):'';
    const status=error instanceof HttpError?error.status:
      'validation' in record?400:code==='FST_ERR_CTP_BODY_TOO_LARGE'?413:
      'statusCode' in record&&record.statusCode===429?429:
      ['ECONNREFUSED','ETIMEDOUT','57P01','08006'].includes(code)?503:500;
    if(status>=500)request.log.error({code,requestId:request.id},'Request failed');
    if([403,404].includes(status)&&identities.has(request)){
      const params=request.params as Record<string,string>;
      if(params?.workspaceId){try{
        await store.pool.query("INSERT INTO audit_events(workspace_id,actor_id,action,object_type,object_id,revision,request_id) SELECT workspace_id,user_id,'access.denied',$3,$4,0,$5 FROM memberships WHERE workspace_id=$1 AND user_id=$2",[params.workspaceId,identities.get(request),request.routeOptions.url?.includes('/runbooks')?'runbook':params.incidentId?'incident':'workspace',params.runbookId??params.incidentId??null,request.id]);
      }catch{request.log.warn({requestId:request.id},'Denial audit unavailable');}}
    }
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
    if(!session)throw new HttpError(401,'unauthenticated','Sign in required');identities.set(request,session.user.id);return session.user;
  }
  app.get('/api/v1/me',{schema:{response:{200:z.object({user:z.object({id:z.string(),name:z.string(),email:z.string()}),workspaces:z.array(z.object({id:z.uuid(),name:z.string(),role:z.string()})),features:z.object({readOnly:z.boolean(),knowledge:z.boolean(),async:z.boolean(),ai:z.literal(false)})})}}},async request=>{const user=await identity(request);return {user:{id:user.id,name:user.name,email:user.email},workspaces:await store.me(user.id),features:{readOnly:settings.READ_ONLY==='true',knowledge:settings.KNOWLEDGE_ENABLED==='true',async:settings.ASYNC_ENABLED==='true',ai:false as const}};});
  app.get('/api/v1/workspaces/:workspaceId/services',{schema:{params:Params}},async request=>{
    const user=await identity(request);await store.member(user.id,request.params.workspaceId);return store.services(request.params.workspaceId);
  });
  app.post('/api/v1/workspaces/:workspaceId/incidents',{schema:{params:Params,body:CreateIncident,response:{201:Incident}}},async(request,reply)=>{
    const user=await identity(request);await store.member(user.id,request.params.workspaceId);
    const result=await store.create(user.id,request.params.workspaceId,request.body,request.id);
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
  app.get('/api/v1/workspaces/:workspaceId/assignees',{schema:{params:Params}},async request=>{
    const user=await identity(request);await store.member(user.id,request.params.workspaceId);return store.assignees(request.params.workspaceId);
  });
  app.post('/api/v1/workspaces/:workspaceId/incidents/:incidentId/actions',{schema:{params:DetailParams,body:Action,response:{200:Incident}}},async request=>{
    const user=await identity(request);return store.act(user.id,request.params.workspaceId,request.params.incidentId,request.body,request.id);
  });
  app.get('/api/v1/workspaces/:workspaceId/incidents/:incidentId/activity',{schema:{params:DetailParams,querystring:HistoryQuery,response:{200:z.object({items:z.array(Activity),nextBeforeRevision:z.number().nullable()})}}},async request=>{
    const user=await identity(request);await store.member(user.id,request.params.workspaceId);
    return store.history(request.params.workspaceId,request.params.incidentId,request.query.pageSize,request.query.beforeRevision);
  });
  app.get('/health/ready',async()=>{await store.pool.query('SELECT 1');return {status:'ready'};});
  app.post('/api/v1/workspaces/:workspaceId/runbooks',{schema:{params:Params,body:CreateRunbook,response:{201:RunbookVersion}}},async(request,reply)=>{
    const user=await identity(request);return reply.code(201).send(await knowledge.write(user.id,request.params.workspaceId,request.body,undefined,undefined,request.id));
  });
  app.post('/api/v1/workspaces/:workspaceId/runbooks/:runbookId/versions',{schema:{params:RunbookParams,body:NewVersion,response:{201:RunbookVersion}}},async(request,reply)=>{
    const user=await identity(request);return reply.code(201).send(await knowledge.write(user.id,request.params.workspaceId,request.body,request.params.runbookId,undefined,request.id));
  });
  app.post('/api/v1/workspaces/:workspaceId/runbooks/:runbookId/versions/:number/actions',{schema:{params:VersionParams,body:PublishAction,response:{200:RunbookVersion}}},async request=>{
    const user=await identity(request);return knowledge.write(user.id,request.params.workspaceId,{expectedRevision:request.body.expectedRevision},request.params.runbookId,{action:request.body.action,number:request.params.number},request.id);
  });
  app.get('/api/v1/workspaces/:workspaceId/runbooks/:runbookId/versions/:number',{schema:{params:VersionParams,response:{200:RunbookVersion}}},async request=>{
    const user=await identity(request);return knowledge.version(user.id,request.params.workspaceId,request.params.runbookId,request.params.number);
  });
  app.get('/api/v1/workspaces/:workspaceId/runbooks',{schema:{params:Params,querystring:Search,response:{200:z.object({items:z.array(RunbookVersion),nextCursor:z.string().nullable()})}}},async request=>{
    const user=await identity(request);return knowledge.search(user.id,request.params.workspaceId,request.query);
  });
  app.get('/api/v1/workspaces/:workspaceId/audit',{schema:{params:Params,querystring:AuditQuery}},async request=>{
    const user=await identity(request);return knowledge.events(user.id,request.params.workspaceId,request.query.pageSize,request.query.before);
  });
  async function access(request:FastifyRequest,workspace:string){const user=await identity(request);await store.member(user.id,workspace);if(settings.ASYNC_ENABLED==='false'||!operations)throw new HttpError(503,'async_unavailable','Async operations unavailable');return {user,ops:operations};}
  app.post('/api/v1/workspaces/:workspaceId/incidents/:incidentId/exports',{schema:{params:DetailParams,body:ExportRequest}},async(request,reply)=>{
    const {user,ops}=await access(request,request.params.workspaceId);return reply.code(202).send(await ops.request(user.id,request.params.workspaceId,request.params.incidentId,request.body,'export',request.id));
  });
  app.post('/api/v1/workspaces/:workspaceId/incidents/:incidentId/attachments',{schema:{params:DetailParams,body:UploadRequest}},async(request,reply)=>{
    const {user,ops}=await access(request,request.params.workspaceId);return reply.code(202).send(await ops.request(user.id,request.params.workspaceId,request.params.incidentId,request.body,'attach',request.id));
  });
  app.get('/api/v1/workspaces/:workspaceId/incidents/:incidentId/files',{schema:{params:DetailParams}},async request=>{
    const {user,ops}=await access(request,request.params.workspaceId);await store.detail(request.params.workspaceId,request.params.incidentId);return ops.files(user.id,request.params.workspaceId,request.params.incidentId);
  });
  app.get('/api/v1/workspaces/:workspaceId/operations',{schema:{params:Params,querystring:OperationList}},async request=>{
    const {user,ops}=await access(request,request.params.workspaceId);return ops.list(user.id,request.params.workspaceId,request.query.pageSize,request.query.before,request.query.incidentId);
  });
  app.get('/api/v1/workspaces/:workspaceId/operations/:operationId',{schema:{params:OperationParams}},async request=>{
    const {user,ops}=await access(request,request.params.workspaceId);return ops.operation(user.id,request.params.workspaceId,request.params.operationId);
  });
  app.post('/api/v1/workspaces/:workspaceId/operations/:operationId/retry',{schema:{params:OperationParams,body:z.strictObject({})}},async(request,reply)=>{
    const {user,ops}=await access(request,request.params.workspaceId);return reply.code(202).send(await ops.retry(user.id,request.params.workspaceId,request.params.operationId,request.id));
  });
  app.get('/api/v1/workspaces/:workspaceId/files/:fileId',{schema:{params:FileParams}},async(request,reply)=>{
    const {user,ops}=await access(request,request.params.workspaceId);const file=await ops.download(user.id,request.params.workspaceId,request.params.fileId);
    return reply.header('cache-control','no-store').header('content-disposition','attachment; filename="'+file.filename+'"').type(file.mime).send(file.bytes);
  });
  app.delete('/api/v1/workspaces/:workspaceId/files/:fileId',{schema:{params:FileParams}},async(request,reply)=>{
    const {user,ops}=await access(request,request.params.workspaceId);return reply.code(202).send(await ops.remove(user.id,request.params.workspaceId,request.params.fileId,request.id));
  });
  app.get('/api/v1/workspaces/:workspaceId/notifications',{schema:{params:Params,querystring:BoundedPage}},async request=>{
    const {user,ops}=await access(request,request.params.workspaceId);return ops.notices(user.id,request.params.workspaceId,request.query.pageSize,request.query.before);
  });
  app.post('/api/v1/workspaces/:workspaceId/notifications/:notificationId/read',{schema:{params:NotificationParams,body:z.strictObject({})}},async request=>{
    const {user,ops}=await access(request,request.params.workspaceId);return ops.markRead(user.id,request.params.workspaceId,request.params.notificationId);
  });
  if(serveWeb){
    await app.register(staticPlugin,{root:resolve('apps/web/dist'),prefix:'/'});
    app.setNotFoundHandler((request,reply)=>{
      if(request.url.startsWith('/api/')||!['GET','HEAD'].includes(request.method))return reply.code(404).send({error:{code:'not_found',message:'Resource not found',requestId:request.id}});
      return reply.sendFile('index.html');
    });
  }
  return app;
}
