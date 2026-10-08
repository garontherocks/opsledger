import {test} from 'node:test';
import assert from 'node:assert/strict';
import {api} from '../apps/web/src/api.ts';
test('interrupted writes are not silently retried',async t=>{
 const fetch=t.mock.method(globalThis,'fetch',async()=>{throw new TypeError('offline');});
 await assert.rejects(api('/api/v1/example',{method:'POST',body:'{}'}),/Refresh to check the result/);assert.equal(fetch.mock.callCount(),1);
});
test('safe API error reference is preserved for recovery',async t=>{
 t.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({error:{message:'Service unavailable',requestId:'safe-reference'}}),{status:503}));
 await assert.rejects(api('/api/v1/example'),error=>error instanceof Error&&error.message.includes('safe-reference')&&(error as Error&{status:number}).status===503);
});
test('invalid success response requires checking state before another write',async t=>{
 t.mock.method(globalThis,'fetch',async()=>new Response('<html>proxy response</html>',{status:200}));
 await assert.rejects(api('/api/v1/example',{method:'POST',body:'{}'}),/Refresh before submitting again/);
});
