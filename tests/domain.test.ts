import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CreateIncident,ListQuery} from '../packages/contracts/src/incident.ts';
import {config}from'../apps/api/src/config.ts';
const input={title:'Worker timed out',description:'Multiple jobs stopped unexpectedly',serviceId:'33333333-3333-4333-8333-333333333333',severity:'high'};
test('input trims and counts Unicode code points',()=>{
  assert.equal(CreateIncident.parse({...input,title:'  alert 😀  '}).title,'alert 😀');
  assert.equal(CreateIncident.safeParse({...input,title:'😀'.repeat(120)}).success,true);
  assert.equal(CreateIncident.safeParse({...input,title:'😀'.repeat(121)}).success,false);
});
test('whitespace, short text, invalid severity and privileged fields fail',()=>{
  for(const patch of [{title:'    '},{description:'tiny'},{severity:'urgent'},{role:'admin'},{reporterId:'victim'},{state:'resolved'}])
    assert.equal(CreateIncident.safeParse({...input,...patch}).success,false);
});
test('pagination is bounded and unknown query fields fail',()=>{
  assert.equal(ListQuery.parse({}).pageSize,20);
  for(const input of [{pageSize:0},{pageSize:51},{pageSize:1.5},{pageSize:'no'},{cursor:'x'.repeat(1001)},{sort:'sql'}])
    assert.equal(ListQuery.safeParse(input).success,false);
});
test('production cannot enable lab mode or plain HTTP',()=>{
  const env={DATABASE_URL:'postgresql://localhost/lab',AUTH_SECRET:'x'.repeat(40),NODE_ENV:'production',BASE_URL:'https://example.test'};
  assert.throws(()=>config({...env,LAB_MODE:'true'}));
  assert.throws(()=>config({...env,BASE_URL:'http://example.test'}));
  assert.equal(config(env).LAB_MODE,'false');
});
