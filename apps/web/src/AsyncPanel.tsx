import {useEffect,useState,type FormEvent} from 'react';
import {api} from './api.ts';
type Operation={id:string,kind:string,state:string,attempts:number,lastError:string|null,fileId:string|null,timeline?:{seq:string,event:string}[]};
type StoredFile={id:string,kind:string,filename:string,state:string,size:number,sha256:string,ownerId:string};
export function AsyncPanel({workspace,incident,revision,role}:{workspace:string,incident:string,revision:number,role:string}){
 const base='/api/v1/workspaces/'+workspace;
 const [recent,setRecent]=useState<Operation[]>([]);
 const [files,setFiles]=useState<StoredFile[]>([]),[operation,setOperation]=useState<Operation|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [exportKey,setExportKey]=useState(crypto.randomUUID()),[uploadKey,setUploadKey]=useState(crypto.randomUUID());
 async function refresh(){setFiles(await api<StoredFile[]>(base+'/incidents/'+incident+'/files'));setRecent((await api<{items:Operation[]}>(base+'/operations?incidentId='+incident)).items);}
 useEffect(()=>{const abort=new AbortController();Promise.all([api<StoredFile[]>(base+'/incidents/'+incident+'/files',{signal:abort.signal}),api<{items:Operation[]}>(base+'/operations?incidentId='+incident,{signal:abort.signal})]).then(([files,ops])=>{setFiles(files);setRecent(ops.items);}).catch(e=>{if(!abort.signal.aborted)setError((e as Error).message);});return ()=>abort.abort();},[base,incident]);
 async function execute(work:()=>Promise<void>){setBusy(true);setError('');try{await work();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 function upload(event:FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget),file=data.get('attachment') as File;
  void execute(async()=>{if(!file.size||file.size>16384)throw new Error('Choose a .txt UTF-8 file up to 16 KiB.');const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
   setOperation(await api<Operation>(base+'/incidents/'+incident+'/attachments',{method:'POST',body:JSON.stringify({requestKey:uploadKey,filename:file.name,mime:'text/plain',base64:btoa(binary)})}));await refresh();});
 }
 return <section aria-label="Incident files"><h3>Incident files</h3><p>Private downloads. Attachments accept .txt UTF-8 only, up to 16 KiB. Exports capture this incident revision and the latest 50 activity entries.</p>
  {error&&<p role="alert">{error}</p>}{busy&&<p role="status">Loading files…</p>}
  <button disabled={busy} onClick={()=>void execute(async()=>{setOperation(await api<Operation>(base+'/incidents/'+incident+'/exports',{method:'POST',body:JSON.stringify({requestKey:exportKey,expectedRevision:revision})}));await refresh();})}>Request incident export</button>
  <button disabled={busy} onClick={()=>{setExportKey(crypto.randomUUID());setOperation(null);}}>New export request</button>
  <form onSubmit={upload}><label htmlFor="attachment">Text attachment</label><input id="attachment" name="attachment" type="file" accept=".txt,text/plain" required onChange={()=>setUploadKey(crypto.randomUUID())}/><button disabled={busy}>Upload text attachment</button></form>
  <button disabled={busy} onClick={()=>void execute(refresh)}>Refresh files</button>
  <details><summary>Recent operations (latest 20)</summary><ul>{recent.map(item=><li key={item.id}><button disabled={busy} onClick={()=>void execute(async()=>setOperation(await api<Operation>(base+'/operations/'+item.id)))}>{item.kind} · {item.state} · {item.id}</button></li>)}</ul></details>
  {operation&&<article aria-label="Async operation"><p>{operation.kind} · {operation.state} · Attempts {operation.attempts}</p>{operation.lastError&&<p>{operation.lastError}</p>}
   <button disabled={busy} onClick={()=>void execute(async()=>{setOperation(await api<Operation>(base+'/operations/'+operation.id));await refresh();})}>Refresh operation</button>
   {operation.state==='failed'&&<button disabled={busy} onClick={()=>void execute(async()=>setOperation(await api<Operation>(base+'/operations/'+operation.id+'/retry',{method:'POST',body:'{}'})))}>Retry failed operation</button>}
   {operation.timeline&&<ul>{operation.timeline.map(event=><li key={event.seq}>{event.event}</li>)}</ul>}
  </article>}
  {!files.length&&<p>No private files.</p>}<ul>{files.map(file=><li key={file.id}>{file.filename} · {file.state} · {file.size} bytes
   {file.state==='ready'&&<><p><code className="content-hash">SHA-256: {file.sha256}</code></p><a href={base+'/files/'+file.id}>Download {file.filename}</a></>}
   {['ready','pending'].includes(file.state)&&<button disabled={busy} onClick={()=>void execute(async()=>{setOperation(await api<Operation>(base+'/files/'+file.id,{method:'DELETE'}));await refresh();})}>Remove {file.filename}</button>}
  </li>)}</ul><p>Removal requires the file owner or workspace lead/admin ({role}). Pending work must finish or fail before removal.</p>
 </section>;
}
export function NotificationsPanel({workspace}:{workspace:string}){
 const base='/api/v1/workspaces/'+workspace+'/notifications';
 type Page={items:{id:string,message:string,readAt:string|null}[],nextBefore:string|null};
 const [page,setPage]=useState<Page>({items:[],nextBefore:null}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function execute(work:()=>Promise<void>){setBusy(true);setError('');try{await work();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 useEffect(()=>{const abort=new AbortController();api<Page>(base,{signal:abort.signal}).then(setPage).catch(e=>{if(!abort.signal.aborted)setError((e as Error).message);});return ()=>abort.abort();},[base]);
 return <section aria-label="Notifications"><h2>Notifications</h2>{error&&<p role="alert">{error}</p>}
  <button disabled={busy} onClick={()=>void execute(async()=>setPage(await api<Page>(base)))}>Refresh notifications</button>
  {!page.items.length&&<p>No notifications yet. Pending events remain durable while the worker is unavailable.</p>}
  <ul>{page.items.map(item=><li key={item.id}>{item.message} · {item.readAt?'Read':'Unread'}{!item.readAt&&<button disabled={busy} onClick={()=>void execute(async()=>{await api(base+'/'+item.id+'/read',{method:'POST',body:'{}'});setPage(await api<Page>(base));})}>Mark read</button>}</li>)}</ul>
  {page.nextBefore&&<button disabled={busy} onClick={()=>void execute(async()=>{const older=await api<Page>(base+'?before='+page.nextBefore);setPage(old=>({items:[...old.items,...older.items],nextBefore:older.nextBefore}));})}>Older notifications</button>}
 </section>;
}
