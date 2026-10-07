import {test} from 'node:test';
import assert from 'node:assert/strict';
import {UploadRequest,ExportRequest,decodeText} from '../packages/contracts/src/async.ts';
test('attachments are bounded canonical base64 UTF-8 text with conservative names',()=>{
 const input={requestKey:'request_key_123',filename:'worker-notes.txt',mime:'text/plain',base64:Buffer.from('Fictional evidence 😀').toString('base64')};
 assert.ok(UploadRequest.safeParse(input).success);assert.equal(decodeText(input.base64).toString(),'Fictional evidence 😀');
 for(const filename of ['../x.txt','/x.txt','evil.html','x.txt\r\nHeader: x','CON.txt','a..txt','a\\x.txt']){
  assert.equal(UploadRequest.safeParse({...input,filename}).success,false);
 }
 for(const data of [Buffer.alloc(16385,65),Buffer.from([0xff]),Buffer.from('a\0b'),Buffer.alloc(0)])assert.throws(()=>decodeText(data.toString('base64')));
 assert.equal(decodeText(Buffer.alloc(16384,65).toString('base64')).length,16384);
 assert.throws(()=>decodeText('YR=='));
 assert.equal(UploadRequest.safeParse({...input,role:'admin'}).success,false);
 assert.equal(ExportRequest.safeParse({requestKey:'short',expectedRevision:1}).success,false);
});
