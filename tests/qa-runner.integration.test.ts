import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fixedQaRunner} from '../scripts/qa-fixed-runner.ts';
test('Phase 16 real registered executable suite binds all results to checkout SHA',{skip:!process.env.GITHUB_SHA,timeout:40000},async()=>{
 const sha=await fixedQaRunner.currentSha();assert.equal(sha,process.env.GITHUB_SHA);
 await assert.rejects(fixedQaRunner.run('a'.repeat(40),new AbortController().signal));
 const receipt=await fixedQaRunner.run(sha,AbortSignal.timeout(30000));assert.ok(receipt.checks.every(x=>x.passed));assert.equal(receipt.checks.length,4);assert.equal(receipt.operationalAuthority,false);
 await mkdir('evidence',{recursive:true});await writeFile('evidence/phase16-registered-suite.json',JSON.stringify(receipt,null,2));console.log('QA_REGISTERED_SUITE '+JSON.stringify(receipt));
});
