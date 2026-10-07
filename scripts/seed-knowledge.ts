import type {Pool} from 'pg';
import {contentHash} from '../apps/api/src/knowledge.ts';
import {audit} from '../apps/api/src/audit.ts';
export async function seedKnowledge(pool:Pool){
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  for(let i=1;i<=24;i++){
   const north=i<=20,workspace=north?'11111111-1111-4111-8111-111111111111':'22222222-2222-4222-8222-222222222222';
   const id='aaaaaaaa-aaaa-4aaa-8aaa-'+String(i).padStart(12,'0');
   const service=north?'33333333-3333-4333-8333-333333333333':'44444444-4444-4444-8444-444444444444';
   const actor=north?'north-editor':'south-editor';
   const title=i<=2?'Worker timeout recovery':'Synthetic operational guide '+String(i).padStart(2,'0');
   const body=i===6?'# Untrusted example\n<script>window.__poison=true</script>\n[Unsafe link](javascript:alert(1))\nWorker timeout guidance remains plain data.':
    '# '+title+'\nFictional worker timeout recovery example '+i+'.\nCheck the synthetic queue and record evidence. No real system command is provided.';
   const category=(['operations','recovery','security'] as const)[i%3]!;
   const input={title,body,category};
   const inserted=await client.query('INSERT INTO runbooks(id,workspace_id,service_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING id',[id,workspace,service]);
   if(!inserted.rowCount)continue;
   const status=i===3||i===5?'withdrawn':i===4?'draft':'published';
   await client.query('INSERT INTO runbook_versions(runbook_id,number,title,body,category,status,content_hash,created_by,created_at) VALUES($1,1,$2,$3,$4,$5,$6,$7,$8)',[id,title,body,category,status,contentHash(input,service),actor,'2026-01-01T00:00:00Z']);
   if(status==='published')await client.query('UPDATE runbooks SET published_version=1 WHERE id=$1',[id]);
   if(i===5){
    const next={title,body:body+'\nCorrected version replaces the obsolete guidance.',category};
    await client.query("INSERT INTO runbook_versions(runbook_id,number,title,body,category,status,content_hash,created_by,created_at) VALUES($1,2,$2,$3,$4,'published',$5,$6,$7)",[id,title,next.body,category,contentHash(next,service),actor,'2026-01-01T00:00:00Z']);
    await client.query('UPDATE runbooks SET latest_version=2,published_version=2,revision=2 WHERE id=$1',[id]);
   }
   await audit(client,workspace,actor,'lab.seed','runbook',id,i===5?2:1,crypto.randomUUID());
  }
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
