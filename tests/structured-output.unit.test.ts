import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateSummary} from '../apps/api/src/structured-output.ts';
import {SUMMARY_JSON_SCHEMA,RISK_JSON_SCHEMA} from '../packages/contracts/src/assistance.ts';
import {evaluateCase,type EvalCase} from '../apps/api/src/assistance-eval.ts';
const dataset=JSON.parse(await readFile('tests/fixtures/phase7-eval-v1.json','utf8')) as {cases:EvalCase[]};
for(const item of dataset.cases)test('contract boundary / '+item.split+' / '+item.id,()=>{const result=evaluateCase(item);assert.equal(result.boundary,item.expectedBoundary);if(item.id.includes('semantic-falsehood')||item.id.includes('false-closure')){assert.ok(result.validated);assert.equal(result.literalOracle?.passes,false);assert.equal(result.truthGuarantee,false);}});
test('provider schemas close root and nested object keys',()=>{assert.equal(SUMMARY_JSON_SCHEMA.additionalProperties,false);assert.equal(RISK_JSON_SCHEMA.additionalProperties,false);assert.ok(JSON.stringify(SUMMARY_JSON_SCHEMA).includes('eventId'));});

test('JSON unicode escaping cannot bypass decoded unsafe-content rejection',()=>{const raw='{"status":"draft","state":"reported","summary":"\\u003cscript\\u003ealert(1)\\u003c/script\\u003e","timeline":[],"unknowns":[]}';assert.throws(()=>validateSummary(raw,{state:'reported',eventIds:[]}),(error:unknown)=>(error as {code:string}).code==='model_unsafe');});
