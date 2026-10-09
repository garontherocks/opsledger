import {useState,type FormEvent} from 'react';
import {api} from './api.ts';
type State={id:string,sha:string,revision:number,status:string,expiresAt:number,contextHash:string};
type Run={state:State,workflow:{stage:string,actionHash:string|null,approvalId:string|null}|null,report:unknown,checks:{checks:{name:string,passed:boolean}[]}|null,approval:{reviewerId:string,expiresAt:number}|null,sources:{id:string,path:string,sha:string}[],history:{sequence:number,event:{kind:string}}[],memory:{id:string,risk:string,sourceId:string,expiresAt:number}[]};
export function QaPanel({workspace,role,readOnly}:{workspace:string,role:string,readOnly:boolean}){
 const [run,setRun]=useState<Run|null>(null),[id,setId]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const path='/api/v1/workspaces/'+workspace+'/qa-runs';const reviewer=['lead','admin'].includes(role);
 async function work(task:()=>Promise<void>){setBusy(true);setError('');try{await task();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function refresh(runId:string){setRun(await api<Run>(path+'/'+runId));setId(runId);}
 async function post(suffix:string,body:unknown){await api(path+'/'+id+'/'+suffix,{method:'POST',body:JSON.stringify(body)},45000);await refresh(id);}
 async function load(e:FormEvent){e.preventDefault();await work(()=>refresh(id));}
 return <section aria-label="QA lab"><h2>QA review lab</h2><p>Optional QA evidence. Unverified analysis. No incident changes, merge or release authority.</p>
  <p>Registered lab checks cover domain/policy, QA context, MCP and Skill/HTTP boundaries. Full CI remains a separate required gate.</p>
  {error&&<p role="alert">{error}</p>}{busy&&<p role="status">Working…</p>}
  <button disabled={busy||readOnly} onClick={()=>void work(async()=>{const s=await api<State>(path,{method:'POST',body:'{}'});await refresh(s.id);})}>Create QA run</button>
  <form onSubmit={load}><label>QA run ID<input value={id} onChange={e=>setId(e.target.value)} required pattern="[a-f0-9-]{36}"/></label><button disabled={busy}>Load QA run</button></form>
  {run&&<article aria-label="QA run"><p>Test target SHA: <code>{run.state.sha}</code></p><p>Context digest: <code>{run.state.contextHash}</code></p><p>Revision: {run.state.revision}</p><p>Stage: {run.workflow?.stage??run.state.status}</p>
   <h3>Reviewed context provenance</h3><ul>{run.sources.map(s=><li key={s.id}>{s.path} · <code>{s.sha}</code></li>)}</ul>
   <details><summary>History and reviewed memory</summary><ol>{run.history.map(e=><li key={e.sequence}>{e.sequence}: {e.event.kind}</li>)}</ol><ul>{run.memory.map(m=><li key={m.id}>{m.risk} · {m.sourceId} · expires {new Date(m.expiresAt).toISOString()}</li>)}</ul></details>
   {run.checks&&<><h3>Registered check results</h3><table><thead><tr><th>Check</th><th>Result</th></tr></thead><tbody>{run.checks.checks.map(c=><tr key={c.name}><td>{c.name}</td><td>{c.passed?'Passed':'Failed'}</td></tr>)}</tbody></table></>}
   {run.approval&&<p>Reviewer: {run.approval.reviewerId} · Approval expiry: {new Date(run.approval.expiresAt).toISOString()}</p>}
   {run.state.status==='created'&&<button disabled={busy||readOnly} onClick={()=>void work(()=>post('checkpoint',{key:crypto.randomUUID(),expectedRevision:run.state.revision}))}>Prepare context checkpoint</button>}
   {run.state.status==='context_ready'&&(!run.workflow||run.workflow.stage==='checks_pending')&&<button disabled={busy||readOnly} onClick={()=>void work(()=>post('checks',{}))}>Run registered QA checks</button>}
   {run.workflow?.stage==='awaiting_review'&&<><p>Review the SHA and action below. Approval expires in five minutes and allows one local report write.</p><p>Action: Store reviewed QA report</p><p>Action digest: <code>{run.workflow.actionHash}</code></p>
    <button disabled={busy||readOnly||!reviewer} onClick={()=>void work(()=>post('decision',{key:crypto.randomUUID(),expectedRevision:run.state.revision,sha:run.state.sha,actionHash:run.workflow!.actionHash,decision:'approve',ttlSeconds:300}))}>Approve local report</button>
    <button disabled={busy||readOnly||!reviewer} onClick={()=>void work(()=>post('decision',{key:crypto.randomUUID(),expectedRevision:run.state.revision,sha:run.state.sha,actionHash:run.workflow!.actionHash,decision:'deny',ttlSeconds:300}))}>Deny local report</button></>}
   {run.workflow?.stage==='approved'&&<button disabled={busy||readOnly||!reviewer} onClick={()=>void work(()=>post('report',{key:crypto.randomUUID(),expectedRevision:run.state.revision,sha:run.state.sha,actionHash:run.workflow!.actionHash,approvalId:run.workflow!.approvalId}))}>Store reviewed QA report</button>}
   {run.report!==null&&<><h3>Stored QA report</h3><pre>{JSON.stringify(run.report,null,2)}</pre></>}
  </article>}
 </section>;
}
