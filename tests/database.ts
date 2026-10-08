import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { Pool } from 'pg';
import { migrate } from '../scripts/migrate.ts';
export async function testDatabase(port=55432){
  const external=process.env.TEST_DATABASE_URL;
  if(external){
    const url=new URL(external);
    if(!['127.0.0.1','localhost'].includes(url.hostname)||!url.pathname.endsWith('_test'))throw new Error('Only disposable localhost _test databases allowed');
    const pool=new Pool({connectionString:external,max:4,connectionTimeoutMillis:2000});
    await migrate(pool);
    return {pool,backend:'postgresql-server',dump:undefined,close:()=>pool.end()};
  }
  const db=await PGlite.create();const socket=new PGLiteSocketServer({db,host:'127.0.0.1',port});
  await socket.start();
  const pool=new Pool({host:'127.0.0.1',port,database:'postgres',user:'postgres',max:1,connectionTimeoutMillis:2000});
  await migrate(pool);
  return {pool,backend:'pglite-socket',dump:()=>db.dumpDataDir('none'),close:async()=>{await pool.end();await socket.stop();await new Promise<void>(resolve=>setImmediate(resolve));await db.close();}};
}
