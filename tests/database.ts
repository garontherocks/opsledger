import {vector} from '@electric-sql/pglite-pgvector';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { migrate } from '../scripts/migrate.ts';
export async function testDatabase(port=55432){
  const external=process.env.TEST_DATABASE_URL;
  if(external){
    const url=new URL(external);
    if(!['127.0.0.1','localhost'].includes(url.hostname)||!url.pathname.endsWith('_test'))throw new Error('Only disposable localhost _test databases allowed');
    // Match the fresh PGlite fixture contract without resetting the supplied database.
    // Only this generated database is owned by the harness; the test role needs CREATEDB.
    const name=`opsledger_fixture_${randomUUID().replaceAll('-','')}_test`;
    const admin=new Pool({connectionString:external,max:1,connectionTimeoutMillis:2000});
    await admin.query(`CREATE DATABASE "${name}"`);
    url.pathname=`/${name}`;
    const pool=new Pool({connectionString:url.toString(),max:4,connectionTimeoutMillis:2000});
    const close=async()=>{
      await pool.end();
      try{
        // Pool.end resolves before PostgreSQL necessarily observes socket termination.
        // Never force-terminate clients: their late error events can escape the test.
        for(let attempt=0;;attempt++){
          try{await admin.query(`DROP DATABASE "${name}"`);break;}
          catch(error){if((error as {code?:string}).code!=='55006'||attempt>=99)throw error;await new Promise(resolve=>setTimeout(resolve,20));}
        }
      }finally{await admin.end();}
    };
    try{await migrate(pool);}catch(error){await close();throw error;}
    return {pool,backend:'postgresql-server',dump:undefined,close};
  }
  const db=await PGlite.create({extensions:{vector}});const socket=new PGLiteSocketServer({db,host:'127.0.0.1',port});
  await socket.start();
  const pool=new Pool({host:'127.0.0.1',port,database:'postgres',user:'postgres',max:1,connectionTimeoutMillis:2000});
  await migrate(pool);
  return {pool,backend:'pglite-socket',dump:()=>db.dumpDataDir('none'),close:async()=>{await pool.end();await socket.stop();await new Promise<void>(resolve=>setImmediate(resolve));await db.close();}};
}
