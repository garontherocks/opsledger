import { Pool } from 'pg';
import { hashPassword,verifyPassword } from 'better-auth/crypto';
import { pathToFileURL } from 'node:url';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import {seedKnowledge} from './seed-knowledge.ts';
export const NORTH='11111111-1111-4111-8111-111111111111',SOUTH='22222222-2222-4222-8222-222222222222';
export const NORTH_SERVICE='33333333-3333-4333-8333-333333333333',SOUTH_SERVICE='44444444-4444-4444-8444-444444444444';
export async function seedLab(pool:Pool,password:string){
  const hash=await hashPassword(password);const client=await pool.connect();
  try{
    await client.query('BEGIN');
    for(const [id,name] of [[NORTH,'NorthLab'],[SOUTH,'SouthLab']])await client.query('INSERT INTO workspaces VALUES($1,$2) ON CONFLICT DO NOTHING',[id,name]);
    for(const [id,workspace,name]of [[NORTH_SERVICE,NORTH,'InvoiceWorker'],[SOUTH_SERVICE,SOUTH,'NotificationGateway']])
      await client.query('INSERT INTO services(id,workspace_id,name) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[id,workspace,name]);
    for(const [id,workspace,active,role]of [['north-reporter',NORTH,true,'reporter'],['south-reporter',SOUTH,true,'reporter'],['revoked-reporter',NORTH,false,'reporter'],['north-responder',NORTH,true,'responder'],['north-lead',NORTH,true,'lead'],['north-editor',NORTH,true,'editor'],['north-admin',NORTH,true,'admin'],['south-editor',SOUTH,true,'editor'],['south-responder',SOUTH,true,'responder'],['revoked-responder',NORTH,false,'responder']]){
      await client.query('INSERT INTO "user"(id,name,email,email_verified,created_at,updated_at) VALUES($1,$2,$3,true,now(),now()) ON CONFLICT DO NOTHING',[id,id,id+'@example.test']);
      await client.query('INSERT INTO account(id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES($1,$2,$3,$2,$4,now(),now()) ON CONFLICT DO NOTHING',[id+'-account',id,'credential',hash]);
      await client.query('INSERT INTO memberships VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[id,workspace,role,active]);
    }
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  await seedKnowledge(pool);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(process.env.LAB_MODE!=='true'||process.env.NODE_ENV==='production')throw new Error('Seed requires nonproduction lab mode');
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL required');
  const pool=new Pool({connectionString:process.env.DATABASE_URL});
  await mkdir('.local',{recursive:true});
  let password:string;
  try{password=JSON.parse(await readFile('.local/credentials.json','utf8')).password;}catch(error){
    if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;
    if((await pool.query('SELECT id FROM account WHERE id=$1',['north-reporter-account'])).rowCount){await pool.end();throw new Error('Existing synthetic account: restore the original credential file before seeding');}
    password=crypto.randomUUID()+'-Password9!';
    await writeFile('.local/credentials.json',JSON.stringify({email:'north-reporter@example.test',password}),{mode:0o600,flag:'wx'});
  }
  try{
    const existing=await pool.query('SELECT password FROM account WHERE id=$1',['north-reporter-account']);
    if(existing.rowCount && !await verifyPassword({hash:existing.rows[0].password,password}))throw new Error('Credential file does not match existing synthetic account');
    await seedLab(pool,password);console.log('Synthetic users seeded. Credentials: .local/credentials.json');
  }finally{await pool.end();}
}
