import { readFile,readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { Pool } from 'pg';
export async function migrate(pool:Pool){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(7410001)");
    await client.query('CREATE TABLE IF NOT EXISTS app_migrations(name text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
    for(const name of (await readdir('migrations')).filter(x=>/^\d{4}-[a-z]+\.sql$/.test(x)).sort()){
      const sql=await readFile('migrations/'+name,'utf8');const hash=createHash('sha256').update(sql).digest('hex');
      const previous=await client.query('SELECT sha256 FROM app_migrations WHERE name=$1',[name]);
      if(previous.rowCount){if(previous.rows[0].sha256!==hash)throw new Error('Applied migration changed: '+name);continue;}
      await client.query(sql);await client.query('INSERT INTO app_migrations(name,sha256) VALUES($1,$2)',[name,hash]);
    }
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL required');
  const pool=new Pool({connectionString:process.env.DATABASE_URL});
  try{await migrate(pool);console.log('Migrations applied');}finally{await pool.end();}
}
