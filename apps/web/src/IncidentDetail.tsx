import {useEffect,useState,type FormEvent} from 'react';
import type {IncidentDTO} from '../../../packages/contracts/src/incident.ts';
import type {IncidentAction} from '../../../packages/contracts/src/lifecycle.ts';
import {api} from './api.ts';
type Entry={id:string,revision:number,kind:string,actorId:string,note:string|null,fromState:string,toState:string};
type Page={items:Entry[],nextBeforeRevision:number|null};
export function IncidentDetail({incident,workspace,role,busy,execute,onChange}:{incident:IncidentDTO,workspace:string,role:string,busy:boolean,execute:(work:()=>Promise<void>)=>Promise<void>,onChange:(value:IncidentDTO)=>void}){
 const [history,setHistory]=useState<Page>({items:[],nextBeforeRevision:null});
 const [assignees,setAssignees]=useState<{id:string,name:string}[]>([]);
 const [loadError,setLoadError]=useState('');
 const [historyLoading,setHistoryLoading]=useState(true);
 const path='/api/v1/workspaces/'+workspace+'/incidents/'+incident.id;
 useEffect(()=>{
  const abort=new AbortController();setLoadError('');setHistoryLoading(true);
  Promise.all([api<Page>(path+'/activity',{signal:abort.signal}),api<{id:string,name:string}[]>('/api/v1/workspaces/'+workspace+'/assignees',{signal:abort.signal})])
   .then(([page,available])=>{setHistory(page);setAssignees(available);})
   .catch(e=>{if(!abort.signal.aborted)setLoadError((e as Error).message);})
   .finally(()=>{if(!abort.signal.aborted)setHistoryLoading(false);});
  return ()=>abort.abort();
 },[path,workspace,incident.revision]);
 async function mutate(input:Omit<IncidentAction,'expectedRevision'>){
  await execute(async()=>onChange(await api<IncidentDTO>(path+'/actions',{method:'POST',body:JSON.stringify({...input,expectedRevision:incident.revision})})));
 }
 function form(event:FormEvent<HTMLFormElement>,action:string,field:string,key:string){
  event.preventDefault();const data=new FormData(event.currentTarget);
  void mutate({action,[key]:data.get(field)} as Omit<IncidentAction,'expectedRevision'>);
 }
 function reopen(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const data=new FormData(event.currentTarget),assignee=String(data.get('reopenAssignee')??'');
  void mutate({action:'reopen',reason:String(data.get('reason')), ...(assignee?{assigneeId:assignee}:{})} as Omit<IncidentAction,'expectedRevision'>);
 }
 const operational=['responder','lead'].includes(role),lead=role==='lead';
 return <article aria-label="Incident detail"><h3>{incident.title}</h3><p>{incident.description}</p>
  <dl><dt>Status</dt><dd>{incident.state}</dd><dt>Severity</dt><dd>{incident.severity}</dd><dt>Revision</dt><dd>{incident.revision}</dd>
  <dt>Assigned to</dt><dd>{incident.assigneeId??'Unassigned'}</dd></dl>
  {incident.resolutionSummary&&<p>{incident.resolutionSummary}</p>}
  <button disabled={busy} onClick={()=>void execute(async()=>onChange(await api<IncidentDTO>(path)))}>Refresh incident</button>
  {operational&&['reported','triaged','investigating'].includes(incident.state)&&<form onSubmit={e=>form(e,incident.state==='reported'?'triage':'assign','assignee','assigneeId')}>
   <label htmlFor="assignee">Assignee</label><select id="assignee" name="assignee" required>{assignees.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
   <button disabled={busy||!assignees.length}>{incident.state==='reported'?'Triage':'Assign'}</button></form>}
  {operational&&incident.state==='triaged'&&<button disabled={busy} onClick={()=>void mutate({action:'investigate'})}>Investigate</button>}
  {lead&&incident.state==='investigating'&&<form onSubmit={e=>form(e,'resolve','summary','resolutionSummary')}>
   <label>Resolution summary<textarea name="summary" required minLength={10} maxLength={5000}/></label><button disabled={busy}>Resolve</button></form>}
  {lead&&incident.state==='resolved'&&<button disabled={busy} onClick={()=>void mutate({action:'close'})}>Close incident</button>}
  {lead&&['resolved','closed'].includes(incident.state)&&<form onSubmit={reopen}>
   <label htmlFor="reopen-assignee">Reopen assignee</label><select id="reopen-assignee" name="reopenAssignee" defaultValue=""><option value="">Keep current assignment</option>{assignees.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
   <label>Reopen reason<textarea name="reason" required minLength={10} maxLength={5000}/></label><button disabled={busy}>Reopen</button></form>}
  <form onSubmit={e=>form(e,'comment','comment','body')}><label>Comment<textarea name="comment" required maxLength={5000}/></label><button disabled={busy}>Add comment</button></form>
  <h4>Activity</h4>{loadError&&<p role="alert">{loadError}</p>}
  {historyLoading&&<p role="status">Loading activity…</p>}
  {!historyLoading&&!loadError&&!history.items.length&&<p>No activity yet.</p>}
  <ol>{history.items.map(entry=><li key={entry.id}>Revision {entry.revision} · {entry.kind} · {entry.actorId}<p>{entry.fromState} → {entry.toState}</p>{entry.note&&<p>{entry.note}</p>}</li>)}</ol>
  {history.nextBeforeRevision&&<button disabled={busy} onClick={()=>void execute(async()=>{
   const older=await api<Page>(path+'/activity?beforeRevision='+history.nextBeforeRevision);
   setHistory(current=>({items:[...current.items,...older.items],nextBeforeRevision:older.nextBeforeRevision}));
  })}>Older activity</button>}
 </article>;
}
