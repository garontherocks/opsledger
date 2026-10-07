import {spawn} from 'node:child_process';
const child=spawn(process.execPath,['--experimental-strip-types','--test','--test-concurrency=1','tests/integration.test.ts','tests/lifecycle.integration.test.ts','tests/knowledge.integration.test.ts','tests/async.integration.test.ts'],{stdio:'inherit',env:{...process.env,TEST_PASSWORD:crypto.randomUUID()+'-Pass9!'}});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
