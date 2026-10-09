// Test-only fixed crash probe. No endpoint or model can select its modes.
import {Pool,type PoolClient} from 'pg';
import {QaStore} from '../apps/api/src/qa-state.ts';
import {QaWorkflow,QA_CHECKS,type QaRunner} from '../apps/api/src/qa-workflow.ts';
import {hash} from '../apps/api/src/qa-agent.ts';
const sha=process.env.QA_PROBE_SHA!,mode=process.env.QA_PROBE_MODE!;
const tables:Record<string,string>={context:'qa_history',claim:'qa_workflows',receipt:'qa_checks',approval:'qa_approvals',report:'qa_reports'};
if(!tables[mode]&&mode!=='after_report')throw new Error('probe_mode');
const url=new URL(process.env.QA_PROBE_DATABASE!);if(url.hostname!=='127.0.0.1')throw new Error('probe_database');
const pool=new Pool({connectionString:url.href,max:1});const original=pool.connect.bind(pool);
Object.assign(pool,{connect:async()=>{const c=await original();return new Proxy(c,{get(target,prop){if(prop==='query')return async(...args:Parameters<PoolClient['query']>)=>{const r=await Reflect.apply(target.query,target,args);if(typeof args[0]==='string'&&args[0].startsWith('INSERT INTO '+tables[mode]))process.kill(process.pid,'SIGKILL');return r;};const value=Reflect.get(target,prop);return typeof value==='function'?value.bind(target):value;}});}});
const store=new QaStore(pool,process.env.QA_PROBE_SECRET!,sha,[{id:'contract',sha,digest:hash('reviewed contract'),path:'packages/contracts/src/lifecycle.ts'}]);
const runner:QaRunner={currentSha:async()=>sha,run:async()=>({version:'qa-lab-checks-v1',sha,checks:QA_CHECKS.map(name=>({name,passed:true})),scope:'registered-lab-checks-only',operationalAuthority:false})};
const flow=new QaWorkflow(store,runner),owner={workspaceId:process.env.QA_PROBE_WORKSPACE!,userId:process.env.QA_PROBE_USER!},id=process.env.QA_PROBE_ID!;
try{
 if(mode==='context')await store.checkpoint(owner,id,1,crypto.randomUUID());
 else if(mode==='claim'||mode==='receipt')await flow.checks(owner,id);
 else if(mode==='approval'){const r=await flow.read(owner,id);await flow.decide(owner,id,{key:crypto.randomUUID(),expectedRevision:r.state.revision,sha,actionHash:r.workflow!.actionHash,decision:'approve',ttlSeconds:300});}
 else {const r=await flow.read(owner,id);await flow.consume(owner,id,{key:crypto.randomUUID(),expectedRevision:r.state.revision,sha,actionHash:r.workflow!.actionHash,approvalId:r.workflow!.approvalId});if(mode==='after_report')process.kill(process.pid,'SIGKILL');}
 throw new Error('crash_boundary_not_reached');
}finally{await pool.end();}
