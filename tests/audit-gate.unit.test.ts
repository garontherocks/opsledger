import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {evaluate,summary,type AuditReport,type ExceptionsFile,type Lockfile} from '../scripts/audit-gate.ts';

const fixture=<T>(name:string)=>JSON.parse(readFileSync(join(import.meta.dirname,'fixtures','audit-gate',name),'utf8')) as T;
const lock=fixture<Lockfile>('lock.json');
const all=fixture<ExceptionsFile>('exceptions.json');
const only=(...ids:string[]):ExceptionsFile=>({exceptions:all.exceptions.filter(e=>ids.includes(e.id))});
const TODAY='2026-11-06';

test('clean audit with no exceptions passes',()=>{
  const result=evaluate(fixture<AuditReport>('audit-clean.json'),lock,{exceptions:[]},TODAY);
  assert.deepEqual([result.ok,result.errors,result.warnings,result.excepted],[true,[],[],[]]);
  assert.match(summary(result),/^audit gate: PASS/);
});

test('unexcepted finding at or above moderate fails',()=>{
  const result=evaluate(fixture<AuditReport>('audit-unexcepted.json'),lock,all,TODAY);
  assert.equal(result.ok,false);
  assert.ok(result.errors.some(e=>e.startsWith('not excepted: GHSA-0000-0000-0003 nested-lib (moderate')),result.errors.join('\n'));
  assert.match(summary(result),/^audit gate: FAIL/);
});

test('excepted finding reachable only through promptfoo passes; low findings are not gated',()=>{
  const result=evaluate(fixture<AuditReport>('audit-excepted-promptfoo.json'),lock,only('GHSA-0000-0000-0001'),TODAY);
  assert.deepEqual([result.ok,result.errors,result.warnings],[true,[],[]]);
  assert.equal(result.excepted.length,1);assert.match(result.excepted[0] as string,/GHSA-0000-0000-0001 deep-lib .*only via \[promptfoo\]/);
  assert.equal(result.below,1);
});

test('excepted id reachable through a path without the required ancestor fails',()=>{
  const result=evaluate(fixture<AuditReport>('audit-other-path.json'),lock,only('GHSA-0000-0000-0002'),TODAY);
  assert.equal(result.ok,false);assert.deepEqual(result.excepted,[]);
  assert.deepEqual(result.errors,['GHSA-0000-0000-0002 is excepted only through [promptfoo] but is reachable via (root) > app-dep@1.0.0 > shared-lib@2.0.0']);
});

test('expired exception fails even when the finding is still promptfoo-only',()=>{
  const report=fixture<AuditReport>('audit-excepted-promptfoo.json');
  assert.equal(evaluate(report,lock,only('GHSA-0000-0000-0001'),'2027-02-06').ok,true,'valid through its expiry date');
  const result=evaluate(report,lock,only('GHSA-0000-0000-0001'),'2027-02-07');
  assert.equal(result.ok,false);
  assert.deepEqual(result.errors,['exception GHSA-0000-0000-0001 (deep-lib) expired on 2027-02-06; re-review it (ADR 0019)']);
});

test('stale exception warns without failing',()=>{
  const result=evaluate(fixture<AuditReport>('audit-clean.json'),lock,all,TODAY);
  assert.equal(result.ok,true);assert.deepEqual(result.errors,[]);
  assert.equal(result.warnings.length,2);assert.ok(result.warnings.every(w=>w.startsWith('stale exception GHSA-0000-0000-000')));
  assert.match(summary(result),/WARN {4}stale exception GHSA-0000-0000-0001 \(deep-lib\)/);
});

test('changed severity, malformed entries and a failed audit run fail closed',()=>{
  const report=fixture<AuditReport>('audit-excepted-promptfoo.json');
  const escalated=evaluate(report,lock,{exceptions:[{...only('GHSA-0000-0000-0001').exceptions[0]!,severity:'moderate'}]},TODAY);
  assert.equal(escalated.ok,false);assert.match(escalated.errors.join('\n'),/decided at severity moderate, audit now reports high/);
  const malformed=evaluate(report,lock,{exceptions:[{...only('GHSA-0000-0000-0001').exceptions[0]!,requiredAncestors:[],expires:'soon'}]},TODAY);
  assert.equal(malformed.ok,false);assert.match(malformed.errors.join('\n'),/is invalid/);
  const failed=evaluate({error:{code:'ENOTFOUND'}},lock,{exceptions:[]},TODAY);
  assert.equal(failed.ok,false);assert.match(failed.errors.join('\n'),/did not return a vulnerability report/);
});
