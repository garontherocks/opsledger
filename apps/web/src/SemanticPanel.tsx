import {useState,type FormEvent} from 'react';
import {SemanticResult,type Hit} from '../../../packages/contracts/src/retrieval.ts';
import {api} from './api.ts';
export function SemanticPanel({workspace,canWrite}:{workspace:string,canWrite:boolean}){
 const [query,setQuery]=useState(''),[hits,setHits]=useState<Hit[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function search(event:FormEvent){event.preventDefault();setBusy(true);setError('');try{const result=SemanticResult.parse(await api('/api/v1/workspaces/'+workspace+'/runbooks/semantic?'+new URLSearchParams({q:query})));setHits(result.items);}catch(e){setHits([]);setError((e as Error).message);}finally{setBusy(false);}}
 return <section aria-label="Semantic runbook search"><h3>Semantic search (optional lab)</h3><p>Ranked source excerpts, not verified answers. Keyword search remains available.</p><form onSubmit={e=>void search(e)}><label>Semantic question<input value={query} onChange={e=>setQuery(e.target.value)} required maxLength={200}/></label><button disabled={busy}>Search semantically</button></form>{error&&<p role="alert">{error}</p>}{canWrite&&<p>Index a published version using its “Index published version” control. Reindex when the embedding digest changes.</p>}<ol>{hits.map(hit=><li key={hit.chunkId}><a href={'/api/v1/workspaces/'+workspace+'/runbooks/'+hit.runbookId+'/versions/'+hit.version}>{hit.title} · v{hit.version}</a><p>Span {hit.start}–{hit.end} · cosine {hit.score.toFixed(3)}</p><pre>{hit.text}</pre></li>)}</ol></section>;
}
