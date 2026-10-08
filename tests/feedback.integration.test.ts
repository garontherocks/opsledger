import {test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {testDatabase} from './database.ts';
import {seedLab,NORTH,SOUTH} from '../scripts/seed.ts';
import {Feedback} from '../apps/api/src/feedback.ts';
test('Phase 10 feedback authenticates issued runs without operational authority',async()=>{
 const db=await testDatabase(55445);try{await seedLab(db.pool,crypto.randomUUID()+'-Pass9!');const feedback=new Feedback(db.pool,crypto.randomUUID()),run={runId:crypto.randomUUID(),promptVersion:'runbook-grounded-v1',contextHash:'a'.repeat(64),digest:'sha256:'+'b'.repeat(64)},token=feedback.issue('north-reporter',NORTH,run),input={token,decision:'rejected' as const,reason:'factual-error' as const};
 const before=(await db.pool.query('SELECT count(*) FROM incidents')).rows[0].count;await assert.rejects(feedback.record('south-editor',SOUTH,input),{code:'feedback_receipt_invalid'});await assert.rejects(feedback.record('north-reporter',NORTH,{...input,token:token+'tampered'}),{code:'feedback_receipt_invalid'});assert.equal((await feedback.record('north-reporter',NORTH,input)).changesIncident,false);await assert.rejects(feedback.record('north-reporter',NORTH,input),{code:'feedback_already_recorded'});const client=await db.pool.connect();try{await assert.rejects(client.query('UPDATE ai_feedback SET decision=$1 WHERE run_id=$2',['accepted',run.runId]),{code:'23514'});}finally{client.release();}assert.equal((await db.pool.query('SELECT count(*) FROM incidents')).rows[0].count,before);
 const revoked=feedback.issue('north-lead',NORTH,{...run,runId:crypto.randomUUID()});await db.pool.query("UPDATE memberships SET active=false WHERE user_id='north-lead' AND workspace_id=$1",[NORTH]);await assert.rejects(feedback.record('north-lead',NORTH,{...input,token:revoked}),{code:'not_found'});await writeFile('evidence/phase10-feedback.json',JSON.stringify({at:new Date().toISOString(),passed:true,checks:['issued signed receipt','caller/workspace scope','tamper denial','duplicate denial','append-only','revocation denial','no incident mutation'],stored:'decision/reason/version/hashes only; no model text or credentials'},null,2));
 }finally{await db.close();}
});
