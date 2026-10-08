import { createRoot } from 'react-dom/client';
import { useEffect,useState,type FormEvent } from 'react';
import type { IncidentDTO } from '../../../packages/contracts/src/incident.ts';
import './style.css';
import {api} from './api.ts';
import {IncidentDetail} from './IncidentDetail.tsx';
import {AsyncPanel,NotificationsPanel} from './AsyncPanel.tsx';
import {SummaryPanel} from './SummaryPanel.tsx';
import {KnowledgePanel} from './KnowledgePanel.tsx';
type Identity={features:{readOnly:boolean,knowledge:boolean,async:boolean,ai:boolean},user:{name:string,email:string},workspaces:{id:string,name:string,role:string}[]};
type Service={id:string,name:string};
function App(){
  const [reload,setReload]=useState(0);
  const [view,setView]=useState('incidents');const [showFiles,setShowFiles]=useState(false);
  const [identity,setIdentity]=useState<Identity|null>(null),[workspace,setWorkspace]=useState('');
  const [items,setItems]=useState<IncidentDTO[]>([]),[services,setServices]=useState<Service[]>([]);
  const [detail,setDetail]=useState<IncidentDTO|null>(null),[cursor,setCursor]=useState<string|null>(null);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[ready,setReady]=useState(false);
  async function loadIdentity(){
    try{const me=await api<Identity>('/api/v1/me');setIdentity(me);setWorkspace(me.workspaces[0]?.id??'');}catch(e){setIdentity(null);if((e as {status?:number}).status!==401)setError((e as Error).message);}finally{setReady(true);}
  }
  useEffect(()=>{void loadIdentity();},[]);
  useEffect(()=>{
    if(!workspace)return;
    const abort=new AbortController();setBusy(true);setError('');setDetail(null);setShowFiles(false);
    Promise.all([api<{items:IncidentDTO[],nextCursor:string|null}>('/api/v1/workspaces/'+workspace+'/incidents',{signal:abort.signal}),
      api<Service[]>('/api/v1/workspaces/'+workspace+'/services',{signal:abort.signal})])
      .then(([list,available])=>{setItems(list.items);setCursor(list.nextCursor);setServices(available);})
      .catch(e=>{if(!abort.signal.aborted)setError((e as Error).message);}).finally(()=>{if(!abort.signal.aborted)setBusy(false);});
    return ()=>abort.abort();
  },[workspace,reload]);
  async function action(work:()=>Promise<void>){setBusy(true);setError('');try{await work();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function login(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const data=new FormData(event.currentTarget);
    await action(async()=>{await api('/api/auth/sign-in/email',{method:'POST',body:JSON.stringify({email:data.get('email'),password:data.get('password')})});await loadIdentity();});
  }
  async function create(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=event.currentTarget,data=new FormData(form);
    await action(async()=>{
      const incident=await api<IncidentDTO>('/api/v1/workspaces/'+workspace+'/incidents',{method:'POST',body:JSON.stringify({
        title:data.get('title'),description:data.get('description'),severity:data.get('severity'),serviceId:data.get('serviceId'),
      })});
      const list=await api<{items:IncidentDTO[],nextCursor:string|null}>('/api/v1/workspaces/'+workspace+'/incidents');
      setItems(list.items);setCursor(list.nextCursor);setDetail(incident);form.reset();
    });
  }
  return <><a className="skip-link" href="#content">Skip to content</a><main id="content" tabIndex={-1}><header><p className="eyebrow">OPERATIONS WORKSPACE</p><h1>OpsLedger</h1><p>Report an incident. Keep the evidence clear.</p></header>
    {error&&<><p role="alert">{error}</p><button disabled={busy} onClick={()=>{if(identity)setReload(value=>value+1);else void loadIdentity();}}>Retry loading</button></>}{busy&&<p role="status">Loading…</p>}
    {!ready?<p>Checking session…</p>:!identity?<section><h2>Sign in</h2><form onSubmit={login}>
      <label>Email<input name="email" type="email" autoComplete="username" required/></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required/></label>
      <button disabled={busy}>Sign in</button></form></section>:<>
      <nav aria-label="Account"><span>{identity.user.name}</span><button disabled={busy} onClick={()=>void action(async()=>{
        await api('/api/auth/sign-out',{method:'POST',body:'{}'});setIdentity(null);setItems([]);setDetail(null);setWorkspace('');
      })}>Sign out</button></nav>
      {!identity.workspaces.length?<p>No active workspace access.</p>:<>
      <label htmlFor="workspace">Workspace</label><select id="workspace" disabled={busy} value={workspace} onChange={e=>setWorkspace(e.target.value)}>{identity.workspaces.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select>
      <nav aria-label="Workspace views"><button onClick={()=>setView('incidents')}>Open incidents</button>{identity.features.knowledge&&<button onClick={()=>setView('knowledge')}>Open knowledge</button>}{identity.features.async&&<button onClick={()=>setView('notifications')}>Open notifications</button>}</nav>
      {identity.features.readOnly&&<p role="status">Maintenance mode: workspace writes are paused. Existing queued work can finish.</p>}
      {view==='incidents'&&<div className="columns"><section><h2>Report incident</h2><form onSubmit={create}><fieldset disabled={identity.features.readOnly}>
        <label>Title<input name="title" minLength={5} maxLength={120} required/></label>
        <label>Description<textarea name="description" minLength={10} maxLength={5000} required/></label>
        <label htmlFor="service">Service</label><select id="service" name="serviceId" required>{services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <label htmlFor="severity">Severity</label><select id="severity" name="severity"><option>low</option><option>medium</option><option>high</option><option>critical</option></select>
        <button disabled={busy||!services.length}>Create incident</button></fieldset></form></section>
        <section><h2>Incidents</h2>{!busy&&!items.length&&<p>No incidents reported.</p>}
        <ul>{items.map(i=><li key={i.id}><button disabled={busy} onClick={()=>void action(async()=>setDetail(await api<IncidentDTO>('/api/v1/workspaces/'+workspace+'/incidents/'+i.id)))}>{i.title}</button><small>{i.severity} · {i.state}</small></li>)}</ul>
        {cursor&&<button disabled={busy} onClick={()=>void action(async()=>{
          const page=await api<{items:IncidentDTO[],nextCursor:string|null}>('/api/v1/workspaces/'+workspace+'/incidents?cursor='+encodeURIComponent(cursor));
          setItems(old=>[...old,...page.items]);setCursor(page.nextCursor);
        })}>Load more</button>}
        {detail&&<IncidentDetail key={detail.id} incident={detail} workspace={workspace} readOnly={identity.features.readOnly} role={identity.workspaces.find(w=>w.id===workspace)?.role??''} busy={busy} execute={action} onChange={value=>{setDetail(value);setItems(old=>old.map(i=>i.id===value.id?value:i));}}/>}
        {detail&&identity.features.ai&&<SummaryPanel key={detail.id+'-'+detail.revision} workspace={workspace} incident={detail.id} revision={detail.revision} disabled={busy||identity.features.readOnly}/>}
        {detail&&identity.features.async&&<><button onClick={()=>setShowFiles(value=>!value)}>Open files</button>{showFiles&&<AsyncPanel key={detail.id} workspace={workspace} incident={detail.id} revision={detail.revision} readOnly={identity.features.readOnly} role={identity.workspaces.find(w=>w.id===workspace)?.role??''}/>}</>}
        </section></div>}
      {view==='notifications'&&identity.features.async&&<NotificationsPanel key={workspace} workspace={workspace} readOnly={identity.features.readOnly} onOpen={id=>void action(async()=>{setDetail(await api<IncidentDTO>('/api/v1/workspaces/'+workspace+'/incidents/'+id));setView('incidents');})}/>}
      {view==='knowledge'&&identity.features.knowledge&&<KnowledgePanel key={workspace} workspace={workspace} readOnly={identity.features.readOnly} role={identity.workspaces.find(w=>w.id===workspace)?.role??''} services={services}/>}
      </>}
      </>}
      <footer>OpsLedger · {identity?.features.ai?'Local lab · AI drafts require review':'Deterministic v1 · No AI assistance'}</footer></main></>;
}
const element=document.getElementById('root');if(!element)throw new Error('Missing root');createRoot(element).render(<App/>);
