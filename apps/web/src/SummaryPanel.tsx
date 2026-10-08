import {useEffect,useState} from 'react';
import {api} from './api.ts';
import type {SummaryDTO} from '../../../packages/contracts/src/assistance.ts';
export function SummaryPanel({workspace,incident,revision,disabled}:{workspace:string,incident:string,revision:number,disabled:boolean}){
 const [draft,setDraft]=useState<SummaryDTO|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [abort]=useState(()=>new AbortController());useEffect(()=>()=>abort.abort(),[abort]);
 async function generate(){setBusy(true);setError('');setDraft(null);try{setDraft(await api<SummaryDTO>('/api/v1/workspaces/'+workspace+'/incidents/'+incident+'/summary',{method:'POST',body:JSON.stringify({expectedRevision:revision}),signal:abort.signal},125000));}catch(e){if(!abort.signal.aborted)setError((e as Error).message);}finally{if(!abort.signal.aborted)setBusy(false);}}
 return <section aria-label="AI timeline draft"><h3>AI timeline draft</h3><p>Unverified local draft. Check every claim against activity. No incident action is performed; no draft is saved as incident content.</p>
  <button disabled={disabled||busy} onClick={()=>void generate()}>Draft timeline summary</button>{busy&&<p role="status">Local model working…</p>}{error&&<p role="alert">{error}</p>}
  {draft&&<><pre className="runbook-body">{draft.text}</pre><p>Revision {draft.revision} · {draft.model} · Human review required.</p>{(draft.truncated||draft.omittedOlderEvents||draft.notesTruncated)&&<p role="status">Limited evidence/output: older activity, long notes or output may be omitted. Review the full timeline.</p>}<details><summary>Draft evidence</summary><p>Run {draft.runId} · Prompt {draft.promptVersion} · {Math.round(draft.latencyMs)} ms</p><p className="content-hash">Model digest: {draft.digest}</p><ul>{draft.eventIds.map(id=><li key={id}>{id}</li>)}</ul></details></>}
 </section>;
}
