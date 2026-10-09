// Reviewed fixed child used only by the crash/restart regression. No model inputs.
import {Pool} from 'pg';
import {QaStore} from '../apps/api/src/qa-state.ts';
import {hash} from '../apps/api/src/qa-agent.ts';
const url=new URL(process.env.QA_PROBE_DATABASE!);if(url.hostname!=='127.0.0.1')throw new Error('probe_database');
const pool=new Pool({connectionString:url.href,max:1});
try{
 const store=new QaStore(pool,process.env.QA_PROBE_SECRET!,process.env.QA_PROBE_SHA!,[{id:'lifecycle',sha:'c55eee55fcfeb4c31e0b252a1573156e2a9d41b4',digest:hash('reviewed lifecycle'),path:'packages/contracts/src/lifecycle.ts'}]);
 const result=await store.read({workspaceId:process.env.QA_PROBE_WORKSPACE!,userId:process.env.QA_PROBE_USER!},process.env.QA_PROBE_ID!);
 console.log(JSON.stringify({status:result.state.status,revision:result.state.revision,history:result.history.length,memory:result.memory.length,operationalAuthority:false}));
}finally{await pool.end();}
