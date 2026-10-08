import {useEffect,useState} from 'react';
import {api} from './api.ts';
import {SummaryDraft,type SummaryDTO} from '../../../packages/contracts/src/assistance.ts';
export function SummaryPanel({workspace,incident,revision,disabled}:{workspace:string,incident:string,revision:number,disabled:boolean}){
 const [draft,setDraft]=useState<SummaryDTO|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [decision,setDecision]=useState<'accepted'|'edited'|'rejected'|null>(null),[editing,setEditing]=useState(false),[edited,setEdited]=useState('');
 const [abort]=useState(()=>new AbortController());useEffect(()=>()=>abort.abort(),[abort]);
 async function generate(){setBusy(true);setError('');setDraft(null);setDecision(null);setEditing(false);try{const result=SummaryDraft.parse(await api<SummaryDTO>('/api/v1/workspaces/'+workspace+'/incidents/'+incident+'/summary',{method:'POST',body:JSON.stringify({expectedRevision:revision}),signal:abort.signal},125000));setDraft(result);setEdited(result.text);}catch(e){if(!abort.signal.aborted)setError((e as Error).message);}finally{if(!abort.signal.aborted)setBusy(false);}}
 return <section aria-label="AI timeline draft"><h3>AI timeline draft</h3><p>Unverified local draft. Check every claim against activity. No incident action is performed; no draft is saved as incident content.</p>
  <button disabled={disabled||busy} onClick={()=>void generate()}>Draft timeline summary</button>{busy&&<p role="status">Local model working…</p>}{error&&<p role="alert">{error}</p>}
  {draft&&<><p>Model response: {draft.content.status}. Format and citation checks do not verify truth.</p><pre className="runbook-body">{decision==='edited'?edited:draft.text}</pre>
  {draft.content.status==='draft'&&decision!=='rejected'&&<div aria-label="Human draft review">
   <button disabled={disabled||editing} onClick={()=>setDecision('accepted')}>Accept draft locally</button>
   <button disabled={disabled||editing} onClick={()=>{setEditing(true);setDecision(null);}}>Edit draft</button>
   <button disabled={disabled} onClick={()=>{setDecision('rejected');setEditing(false);}}>Reject draft</button>
   {editing&&<><label htmlFor="draft-edit">Edited draft</label><textarea id="draft-edit" maxLength={8000} value={edited} onChange={event=>setEdited(event.target.value)}/><button disabled={disabled||!edited.trim()} onClick={()=>{setDecision('edited');setEditing(false);}}>Accept edited draft locally</button><button onClick={()=>{setEdited(draft.text);setEditing(false);}}>Cancel edit</button></>}
  </div>}
  {decision&&<p role="status">Review decision: {decision}. Local session only; no incident data was saved or changed.</p>}<p>Revision {draft.revision} · {draft.model} · Human review required.</p>{(draft.truncated||draft.omittedOlderEvents||draft.notesTruncated)&&<p role="status">Limited evidence/output: older activity, long notes or output may be omitted. Review the full timeline.</p>}<details><summary>Draft evidence</summary><p>Evidence describes the original generation; edits are human text.</p><p>Run {draft.runId} · Prompt {draft.promptVersion} · {Math.round(draft.latencyMs)} ms</p><p className="content-hash">Model digest: {draft.digest}</p><ul>{draft.eventIds.map(id=><li key={id}>{id}</li>)}</ul></details></>}
 </section>;
}
