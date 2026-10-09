import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import {readFile,mkdir,writeFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {testDatabase} from '../tests/database.ts';
import {seedLab,NORTH} from './seed.ts';
import {QaStore} from '../apps/api/src/qa-state.ts';
import {QaWorkflow,QA_CHECKS} from '../apps/api/src/qa-workflow.ts';
import {QaOrchestration,webhookSignature,orchestrationApp} from '../apps/api/src/qa-orchestration.ts';
import {hash} from '../apps/api/src/qa-agent.ts';

// Owned disposable Docker resources only. No credentials in command arguments,
// stdout, evidence or exported workflow. This tests n8n, not live model quality.
const exec=promisify(execFile),suffix=randomUUID().slice(0,8),container='qa-n8n-'+suffix,network='qa-net-'+suffix;
const image='n8nio/n8n:2.42.6',dir=resolve('.local/phase17-'+suffix);
const credential=randomUUID()+randomUUID(),signingKey=randomUUID()+randomUUID(),inbound=randomUUID()+randomUUID(),encryption=randomUUID()+randomUUID();
await mkdir(dir,{recursive:true});const envFile=resolve(dir,'n8n.env');
await writeFile(envFile,[`N8N_ENCRYPTION_KEY=${encryption}`,'N8N_DIAGNOSTICS_ENABLED=false','N8N_VERSION_NOTIFICATIONS_ENABLED=false','N8N_TEMPLATES_ENABLED=false','N8N_BLOCK_ENV_ACCESS_IN_NODE=true','N8N_BLOCK_FILE_ACCESS_TO_N8N_FILES=true','N8N_COMMUNITY_PACKAGES_ENABLED=false','N8N_PERSONALIZATION_ENABLED=false','N8N_SECURE_COOKIE=false','N8N_LOG_LEVEL=error','EXECUTIONS_DATA_SAVE_ON_ERROR=none','EXECUTIONS_DATA_SAVE_ON_SUCCESS=none','EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS=false','NODES_EXCLUDE=["n8n-nodes-base.executeCommand","n8n-nodes-base.code","n8n-nodes-base.readWriteFile","n8n-nodes-base.ssh"]'].join('\n')+'\n',{mode:0o600});
async function docker(args:string[]){try{return (await exec('docker',args,{timeout:300000,maxBuffer:1048576})).stdout;}catch(error){const e=error as {code?:unknown,stderr?:string,stdout?:string};let diagnostic=(e.stderr??e.stdout??'').slice(0,2048);for(const secret of [credential,signingKey,inbound,encryption])diagnostic=diagnostic.replaceAll(secret,'[redacted]');throw new Error('Owned n8n Docker '+args[0]+' failed ('+String(e.code)+'): '+diagnostic);}}
let db:Awaited<ReturnType<typeof testDatabase>>|undefined,app:ReturnType<typeof orchestrationApp>|undefined;
try{
 await docker(['pull',image]);await docker(['network','create','--internal',network]);
 const info=JSON.parse(await docker(['network','inspect',network])) as {IPAM:{Config:{Gateway:string}[]}}[];const bridgeHost=info[0]!.IPAM.Config[0]!.Gateway;
 db=await testDatabase(55461);await seedLab(db.pool,randomUUID()+'-Pass9!');const sha='7cd2ca0ba226c2979a887a5f987874208ce6a279',identity={workspaceId:NORTH,userId:'north-lead'};
 const store=new QaStore(db.pool,randomUUID()+randomUUID(),sha,[{id:'contract',path:'packages/contracts/src/lifecycle.ts',sha,digest:hash('reviewed')}]);
 const flow=new QaWorkflow(store,{currentSha:async()=>sha,run:async()=>({version:'qa-lab-checks-v1',sha,checks:QA_CHECKS.map(name=>({name,passed:true})),scope:'registered-lab-checks-only',operationalAuthority:false})});
 const run=await store.create(identity);await store.checkpoint(identity,run.id,1,randomUUID());await flow.checks(identity,run.id);
 let triageCalls=0;const service=new QaOrchestration(flow,{runId:run.id,workspaceId:NORTH,userId:identity.userId,expiresAt:Date.now()+600000},credential,signingKey,async()=>{triageCalls++;return {status:'abstain',risks:[],note:'Actual n8n + native gateway; fixture triage, not a model claim.',operationalAuthority:false};});
 app=orchestrationApp(service);await app.listen({host:bridgeHost,port:3101});
 await docker(['run','-d','--name',container,'--network',network,'--env-file',envFile,image]);
 const address=(await docker(['inspect','--format','{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}',container])).trim();
 assert.match(address,/^\d{1,3}(\.\d{1,3}){3}$/,'Owned internal container address');const n8nUrl='http://'+address+':5678';
 const deadline=Date.now()+90000;let healthy=false;
 while(Date.now()<deadline){try{healthy=(await fetch(n8nUrl+'/healthz',{signal:AbortSignal.timeout(1000)})).ok;if(healthy)break;}catch{/* bounded readiness probe */}await new Promise(r=>setTimeout(r,250));}
 if(!healthy)throw new Error('Owned n8n health deadline exceeded');
 const setup=await fetch(n8nUrl+'/rest/owner/setup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'qa-owner@example.test',firstName:'Owned',lastName:'Fixture',password:randomUUID()+'aA9!'})});assert.equal(setup.status,200,'Disposable n8n owner bootstrap');
 const workflow=JSON.parse(await readFile('lab/n8n/qa-report.json','utf8')) as {nodes:{name:string,parameters:{url?:string}}[]};workflow.nodes.find(n=>n.name==='Scoped TypeScript service')!.parameters.url='http://'+bridgeHost+':3101/events';
 await writeFile(resolve(dir,'workflow.json'),JSON.stringify(workflow),{mode:0o600});await writeFile(resolve(dir,'credentials.json'),JSON.stringify([{id:'QaInbound',name:'Owned QA inbound',type:'httpHeaderAuth',data:{name:'x-qa-inbound',value:inbound}},{id:'QaService',name:'Single-run QA service',type:'httpHeaderAuth',data:{name:'authorization',value:'Bearer '+credential}}]),{mode:0o600});
 for(const file of ['workflow.json','credentials.json']){await docker(['cp',resolve(dir,file),container+':/tmp/'+file]);await docker(['exec','--user','0',container,'chown','node:node','/tmp/'+file]);}
 assert.equal((await docker(['exec',container,'n8n','--version'])).trim(),'2.42.6','Pinned actual runtime');
 await docker(['exec',container,'n8n','import:credentials','--input=/tmp/credentials.json']);await docker(['exec',container,'n8n','import:workflow','--input=/tmp/workflow.json']);await docker(['exec',container,'n8n','publish:workflow','--id=OpsLedgerQaBridge']);await docker(['restart',container]);
 const publishedDeadline=Date.now()+90000;let ready=false;
 while(Date.now()<publishedDeadline){try{ready=(await fetch(n8nUrl+'/healthz',{signal:AbortSignal.timeout(1000)})).ok;if(ready)break;}catch{/* bounded startup */}await new Promise(r=>setTimeout(r,250));}if(!ready)throw new Error('Published n8n startup deadline');
 const make=(operation='inspect',approvalId?:string)=>({version:'qa-webhook-v1',eventId:randomUUID(),runId:run.id,workspaceId:NORTH,sha,issuedAt:Date.now(),operation,...(approvalId?{approvalId}:{})});
 async function trigger(body:ReturnType<typeof make>,signature=webhookSignature(body,signingKey),authorized=true){const response=await fetch(n8nUrl+'/webhook/opsledger-qa-v1',{method:'POST',headers:{'content-type':'application/json','x-qa-inbound':authorized?inbound:'invalid','x-qa-signature':signature},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});return {status:response.status,body:await response.json() as {outcome:string,reportStored:boolean}};}
 assert.equal((await trigger(make(),undefined,false)).status,403);
 const first=make();const observed=await trigger(first);assert.equal(observed.status,202);assert.equal(observed.body.outcome,'awaiting_review');assert.equal((await trigger(first)).body.outcome,'awaiting_review');assert.equal(triageCalls,1);
 assert.equal((await trigger(make(),'0'.repeat(64))).status,502);
 const snap=await flow.read(identity,run.id);const approved=await flow.decide(identity,run.id,{key:randomUUID(),expectedRevision:snap.state.revision,sha,actionHash:snap.workflow!.actionHash,decision:'approve',ttlSeconds:60});
 const storeEvent=make('store_report',approved.approval.id);assert.equal((await trigger(storeEvent)).body.outcome,'complete');assert.equal((await trigger(storeEvent)).body.reportStored,true);assert.equal((await db.pool.query('SELECT count(*) FROM qa_reports WHERE run_id=$1',[run.id])).rows[0].count,'1');
 await docker(['exec',container,'n8n','export:workflow','--id=OpsLedgerQaBridge','--output=/tmp/export.json']);await docker(['cp',container+':/tmp/export.json',resolve(dir,'export.json')]);const exported=await readFile(resolve(dir,'export.json'),'utf8');
 for(const secret of [credential,signingKey,inbound,encryption])assert(!exported.includes(secret),'No secret in real workflow export');
 await mkdir('evidence',{recursive:true});await writeFile('evidence/phase17-n8n-export.json',exported);await writeFile('evidence/phase17-n8n-runtime.json',JSON.stringify({image,backend:db.backend,actualN8n:true,actualSignedHttpWebhook:true,fixtureTriage:true,actualHumanApproval:false,unauthenticatedWebhookDenied:true,forgedSignatureDenied:true,duplicateTriageCalls:triageCalls,reportEffects:1,exportContainsSecrets:false,internalNetwork:true,releaseAuthority:false},null,2)+'\n');console.log('Phase 17 actual n8n webhook/branch/error/dedup/export passed; fixture triage only.');
}catch(error){
 let logs='';try{logs=await docker(['logs','--tail','100',container]);}catch{/* container might not exist */}
 for(const secret of [credential,signingKey,inbound,encryption])logs=logs.replaceAll(secret,'[redacted]');
 let state='unavailable',address='unavailable',inside='unavailable',direct='unavailable';
 try{state=await docker(['inspect','--format','{{json .State}}',container]);address=(await docker(['inspect','--format','{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}',container])).trim();inside=await docker(['exec',container,'node','-e','fetch("http://127.0.0.1:5678/healthz").then(r=>console.log(r.status)).catch(()=>{console.log("unreachable");process.exitCode=1})']);direct=String((await fetch('http://'+address+':5678/healthz',{signal:AbortSignal.timeout(2000)})).status);}catch{/* bounded best-effort diagnostics */}
 const diagnostic={image,error:error instanceof Error?error.message:'runtime_failure',state,address,inside,direct,hostAccess:'owned internal container IP; no published port',logs,actualHumanApproval:false,classification:'n8n runtime/bootstrap evidence, not model quality'}; console.error(JSON.stringify(diagnostic));
 await mkdir('evidence',{recursive:true});await writeFile('evidence/phase17-n8n-failure.json',JSON.stringify(diagnostic,null,2)+'\n');
 throw error;
}finally{
 await app?.close();await db?.close();await docker(['rm','-f','-v',container]).catch(()=>{});await docker(['network','rm',network]).catch(()=>{});await rm(dir,{recursive:true,force:true});
}
