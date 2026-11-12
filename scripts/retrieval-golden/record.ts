// Records the golden-set embeddings with the pinned local model (desktop only, see docs/retrieval-golden.md).
//   npm run rag:golden:record
// Reads the private .env (EMBEDDING_MODEL, EMBEDDING_DIGEST, OLLAMA_URL, OLLAMA_EXPECTED_VERSION), embeds every chunk
// the golden set indexes and every query through the production OllamaEmbeddings provider, and writes
// tests/fixtures/retrieval-golden-v1/embeddings.json. Only vectors and identities are written: no prompts or output.
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {config} from '../../apps/api/src/config.ts';
import {DIMENSIONS,OllamaEmbeddings} from '../../apps/api/src/embeddings.ts';
import {INDEX_VERSION} from '../../apps/api/src/retrieval.ts';
import {GOLDEN_DIR,chunkerSha256,datasetIssues,embeddingKey,encodeVector,loadGolden,recordingInputs,recordingIssues,type Purpose,type Recording} from './golden.ts';

const settings=config({...process.env,EMBEDDINGS_ENABLED:'true'});
if(!settings.EMBEDDING_DIGEST)throw new Error('Set EMBEDDING_DIGEST in .env to the full installed sha256 digest of the embedding model');
const expected=process.env.OLLAMA_EXPECTED_VERSION;
if(!expected)throw new Error('Set OLLAMA_EXPECTED_VERSION to the exact Ollama runtime you are recording with');
const response=await fetch(new URL('/api/version',settings.OLLAMA_URL),{redirect:'error',signal:AbortSignal.timeout(5000)});
if(!response.ok)throw new Error('Ollama is not reachable on the configured loopback URL');
const runtime=(await response.json() as {version:string}).version;
if(runtime!==expected)throw new Error(`Ollama ${runtime} is running but OLLAMA_EXPECTED_VERSION is ${expected}`);

const golden=loadGolden();
const issues=datasetIssues(golden.corpus,golden.queries);
if(issues.length)throw new Error('Fix the golden dataset before recording:\n'+issues.join('\n'));

let hardware='unknown';
try{hardware=execFileSync('nvidia-smi',['--query-gpu=name','--format=csv,noheader'],{encoding:'utf8',timeout:3000,maxBuffer:4096}).trim().split('\n')[0]!.trim();}catch{hardware='no NVIDIA GPU reported';}

const provider=new OllamaEmbeddings(settings);
const inputs=recordingInputs(golden.corpus,golden.queries);
const vectors:Record<string,string>={};
for(const purpose of ['document','query'] as Purpose[]){
  const texts=inputs.filter(i=>i.purpose===purpose).map(i=>i.text);
  // The provider accepts at most four inputs per call and one call at a time.
  for(let i=0;i<texts.length;i+=4){
    const batch=texts.slice(i,i+4);
    const output=await provider.embed(batch,purpose);
    batch.forEach((text,j)=>{vectors[embeddingKey(purpose,text)]=encodeVector(output[j]!);});
    process.stdout.write(`\r${purpose==="query"?"queries":"documents"} ${Math.min(i+4,texts.length)}/${texts.length}`);
  }
  process.stdout.write('\n');
}

const recording:Recording={
  manifest:{version:golden.corpus.version,model:provider.model,digest:provider.digest,dimensions:DIMENSIONS,indexVersion:INDEX_VERSION,chunkerSha256:chunkerSha256(),
    corpusSha256:golden.corpusSha256,queriesSha256:golden.queriesSha256,runtime:`Ollama ${runtime}`,recordedAt:new Date().toISOString(),hardware},
  vectors,
};
const problems=recordingIssues(recording,golden);
if(problems.length)throw new Error('The recording does not match the dataset:\n'+problems.join('\n'));
const target=join(GOLDEN_DIR,'embeddings.json');
writeFileSync(target,JSON.stringify(recording,null,1)+'\n');
console.log(`Recorded ${Object.keys(vectors).length} vectors with ${provider.model} (${provider.digest.slice(0,19)}…) on ${hardware} to ${target}.`);
console.log('Next: run `npm run rag:golden` to replay them against PostgreSQL, then commit the file.');
