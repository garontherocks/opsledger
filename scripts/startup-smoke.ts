import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
const db=await PGlite.create();
const socket=new PGLiteSocketServer({db,host:'127.0.0.1',port:55434});await socket.start();
const env={...process.env,DATABASE_URL:'postgresql://postgres@127.0.0.1:55434/postgres',AUTH_SECRET:crypto.randomUUID()+crypto.randomUUID(),BASE_URL:'http://localhost:3101',PORT:'3101',NODE_ENV:'development',LAB_MODE:'true'};
async function run(file:string){
  const child=spawn(process.execPath,['--experimental-strip-types',file],{env,stdio:'inherit'});
  await new Promise<void>((resolve,reject)=>child.on('error',reject).on('exit',code=>code===0?resolve():reject(new Error(file+' exited '+code))));
}
try{
  await run('scripts/migrate.ts');await run('scripts/migrate.ts');
  await run('scripts/seed.ts');await run('scripts/seed.ts');
  const server=spawn(process.execPath,['--experimental-strip-types','apps/api/src/server.ts'],{env,stdio:'inherit'});
  try{
    let ready=false;
    for(let attempt=0;attempt<50;attempt++){
      try{ready=(await fetch('http://localhost:3101/health/ready')).ok;}catch{/* Startup not ready yet. */}
      if(ready)break;
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    if(!ready)throw new Error('Readiness timeout');
    const response=await fetch('http://localhost:3101/');if(!response.ok||!(await response.text()).includes('OpsLedger'))throw new Error('SPA unavailable');
    const credentials=JSON.parse(await readFile('.local/credentials.json','utf8'));
    const login=await fetch('http://localhost:3101/api/auth/sign-in/email',{method:'POST',headers:{'content-type':'application/json',origin:env.BASE_URL},body:JSON.stringify(credentials)});
    if(!login.ok||!login.headers.getSetCookie().length)throw new Error('Seeded login failed');
    console.log('Startup smoke passed: repeat migrations/seed, real server, readiness, built SPA and seeded login; backend pglite-socket');
  }finally{server.kill('SIGTERM');await new Promise(resolve=>server.once('exit',resolve));}
}finally{await socket.stop();await db.close();}
