import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {mkdir} from 'node:fs/promises';
if(process.env.LAB_MODE!=='true'||process.env.NODE_ENV==='production')throw new Error('Test harness requires nonproduction LAB_MODE=true');
await mkdir('.local',{recursive:true});
const db=await PGlite.create('.local/pglite');
const server=new PGLiteSocketServer({db,host:'127.0.0.1',port:55432});
await server.start();console.log('PGlite test harness on localhost:55432; not a native PostgreSQL server');
for(const signal of ['SIGTERM','SIGINT'] as const)process.on(signal,()=>{
  void server.stop().then(()=>new Promise<void>(resolve=>setImmediate(resolve))).then(()=>db.close()).then(()=>process.exit(0));
});
