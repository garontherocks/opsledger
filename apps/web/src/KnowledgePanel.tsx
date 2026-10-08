import {useEffect,useState,type FormEvent} from 'react';
import type {RunbookDTO} from '../../../packages/contracts/src/knowledge.ts';
import {api} from './api.ts';
type Page={items:RunbookDTO[],nextCursor:string|null};
type AuditPage={items:{seq:string,action:string,actorId:string,revision:number}[],nextBefore:string|null};
export function KnowledgePanel({workspace,role,services,readOnly=false}:{workspace:string,role:string,readOnly?:boolean,services:{id:string,name:string}[]}){
 const writer=['editor','admin'].includes(role),canWrite=writer&&!readOnly;
 const [query,setQuery]=useState(''),[status,setStatus]=useState('published'),[sort,setSort]=useState('title'),[category,setCategory]=useState(''),[service,setService]=useState('');
 const [page,setPage]=useState<Page>({items:[],nextCursor:null}),[detail,setDetail]=useState<RunbookDTO|null>(null),[events,setEvents]=useState<AuditPage|null>(null);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const base='/api/v1/workspaces/'+workspace;
 const [resultPath,setResultPath]=useState(base+'/runbooks?pageSize=10');
 function searchPath(cursor?:string){const params=new URLSearchParams({q:query,status,sort,pageSize:'10'});if(category)params.set('category',category);if(service)params.set('serviceId',service);if(cursor)params.set('cursor',cursor);return base+'/runbooks?'+params;}
 async function execute(work:()=>Promise<void>){setBusy(true);setError('');try{await work();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 useEffect(()=>{
  const abort=new AbortController();setDetail(null);setEvents(null);setBusy(true);setError('');setResultPath(base+'/runbooks?pageSize=10');
  api<Page>(base+'/runbooks?pageSize=10',{signal:abort.signal}).then(setPage).catch(e=>{if(!abort.signal.aborted)setError((e as Error).message);}).finally(()=>{if(!abort.signal.aborted)setBusy(false);});
  return ()=>abort.abort();
 },[base]);
 function search(event:FormEvent){event.preventDefault();void execute(async()=>{const path=searchPath();setPage(await api<Page>(path));setResultPath(path);setDetail(null);});}
 function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const data=new FormData(event.currentTarget);
  void execute(async()=>{
   const body={title:data.get('title'),body:data.get('body'),category:data.get('category'),...(detail?{expectedRevision:detail.revision}:{serviceId:data.get('serviceId')||undefined})};
   setDetail(await api<RunbookDTO>(base+'/runbooks'+(detail?'/'+detail.id+'/versions':''),{method:'POST',body:JSON.stringify(body)}));
   const path=searchPath();setPage(await api<Page>(path));setResultPath(path);
  });
 }
 async function publication(action:string){
  if(!detail)return;
  await execute(async()=>{setDetail(await api<RunbookDTO>(base+'/runbooks/'+detail.id+'/versions/'+detail.number+'/actions',{method:'POST',body:JSON.stringify({action,expectedRevision:detail.revision})}));const path=searchPath();setPage(await api<Page>(path));setResultPath(path);});
 }
 return <section aria-label="Knowledge"><h2>Runbooks</h2>{error&&<p role="alert">{error}</p>}{busy&&<p role="status">Loading knowledge…</p>}
  <form onSubmit={search}><label>Keywords<input value={query} onChange={e=>setQuery(e.target.value)} maxLength={200}/></label>
   <label htmlFor="knowledge-sort">Sort runbooks</label><select id="knowledge-sort" value={sort} onChange={e=>setSort(e.target.value)}><option value="title">Title</option><option value="newest">Newest</option></select>
   <label htmlFor="knowledge-category">Category filter</label><select id="knowledge-category" value={category} onChange={e=>setCategory(e.target.value)}><option value="">All categories</option><option>operations</option><option>recovery</option><option>security</option></select>
   <label htmlFor="knowledge-service">Service filter</label><select id="knowledge-service" value={service} onChange={e=>setService(e.target.value)}><option value="">All services</option>{services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
   {writer&&<><label htmlFor="knowledge-status">Publication filter</label><select id="knowledge-status" value={status} onChange={e=>setStatus(e.target.value)}><option>published</option><option>draft</option><option>withdrawn</option></select></>}
   <button disabled={busy}>Search runbooks</button></form>
  {!busy&&!page.items.length&&<p>No matching runbooks.</p>}
  <ul>{page.items.map(r=><li key={r.id+'-'+r.number}><button disabled={busy} onClick={()=>void execute(async()=>setDetail(await api<RunbookDTO>(base+'/runbooks/'+r.id+'/versions/'+r.number)))}>{r.title} · v{r.number}</button></li>)}</ul>
  {page.nextCursor&&<button disabled={busy} onClick={()=>void execute(async()=>{const next=await api<Page>(resultPath+'&cursor='+encodeURIComponent(page.nextCursor!));setPage(old=>({items:[...old.items,...next.items],nextCursor:next.nextCursor}));})}>More runbooks</button>}
  {detail&&<article aria-label="Runbook version"><h3>{detail.title}</h3><p>Version {detail.number} · {detail.status} · Revision {detail.revision}</p><pre className="runbook-body">{detail.body}</pre>
   <p>SHA-256: <code className="content-hash">{detail.contentHash}</code></p><a href={base+'/runbooks/'+detail.id+'/versions/'+detail.number}>Version JSON</a>
   <button disabled={busy} onClick={()=>void execute(async()=>setDetail(await api<RunbookDTO>(base+'/runbooks/'+detail.id+'/versions/'+detail.number)))}>Refresh version</button>
   {canWrite&&detail.status==='draft'&&<button disabled={busy} onClick={()=>void publication('publish')}>Publish version</button>}
   {canWrite&&detail.status==='published'&&<button disabled={busy} onClick={()=>void publication('withdraw')}>Withdraw version</button>}
  </article>}
  {canWrite&&<><button disabled={busy} onClick={()=>setDetail(null)}>New runbook</button>
   <form key={detail?detail.id+'-'+detail.number:'new'} onSubmit={save}><h3>{detail?'Append a draft version':'Create draft'}</h3>
    <label htmlFor="runbook-title">Runbook title</label><input id="runbook-title" name="title" defaultValue={detail?.title??''} required minLength={5} maxLength={120}/>
    <label htmlFor="runbook-body">Markdown body</label><textarea id="runbook-body" name="body" defaultValue={detail?.body??''} required minLength={10} maxLength={10000}/>
    <label htmlFor="runbook-service">Runbook service</label><select id="runbook-service" name="serviceId" defaultValue={detail?.serviceId??''} disabled={Boolean(detail)}><option value="">General guidance</option>{services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
    <label htmlFor="draft-category">Draft category</label><select id="draft-category" name="category" defaultValue={detail?.category??'operations'}><option>operations</option><option>recovery</option><option>security</option></select>
    <button disabled={busy}>{detail?'Save new version':'Create runbook'}</button></form>
   <button disabled={busy} onClick={()=>void execute(async()=>setEvents(await api<AuditPage>(base+'/audit')))}>Show audit</button>
   {events&&<section aria-label="Workspace audit"><h3>Workspace audit</h3><ol>{events.items.map(e=><li key={e.seq}>{e.action} · {e.actorId} · Revision {e.revision}</li>)}</ol>
    {events.nextBefore&&<button disabled={busy} onClick={()=>void execute(async()=>{const older=await api<AuditPage>(base+'/audit?before='+events.nextBefore);setEvents(old=>old?{items:[...old.items,...older.items],nextBefore:older.nextBefore}:older);})}>Older audit</button>}
   </section>}
  </>}
 </section>;
}
