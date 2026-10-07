import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CreateRunbook,NewVersion,Search,PublishAction} from '../packages/contracts/src/knowledge.ts';
import {contentHash} from '../apps/api/src/knowledge.ts';
test('knowledge boundaries, strict authority and bounded query',()=>{
 const valid={title:'Worker recovery',body:'Fictional worker recovery notes',category:'recovery'};
 assert.equal(CreateRunbook.parse({...valid,title:'  Worker recovery  '}).title,'Worker recovery');
 for(const patch of [{body:'tiny'},{title:' '},{role:'admin'},{status:'published'},{category:'unknown'},{body:'😀'.repeat(10001)}])assert.equal(CreateRunbook.safeParse({...valid,...patch}).success,false);
 assert.equal(NewVersion.safeParse(valid).success,false);
 assert.equal(PublishAction.safeParse({action:'publish',expectedRevision:1,number:999}).success,false);
 for(const input of [{q:'x'.repeat(201)},{pageSize:51},{cursor:'x'.repeat(2001)},{sort:'sql'},{status:'secret'}])assert.equal(Search.safeParse(input).success,false);
});
test('content provenance hash has canonical order and changes with content or service',()=>{
 const a={title:'Worker recovery',body:'Fictional recovery notes',category:'recovery' as const};
 assert.equal(contentHash(a,null),contentHash({category:a.category,body:a.body,title:a.title},null));
 assert.notEqual(contentHash(a,null),contentHash({...a,body:a.body+' Changed'},null));
 assert.notEqual(contentHash(a,null),contentHash(a,'33333333-3333-4333-8333-333333333333'));
});
