// Retrieval quality golden set (docs/retrieval-golden.md): dataset loading and validation, recorded
// embeddings, the replay provider and the metrics. Pure functions; the database part lives in the test.
import {createHash} from 'node:crypto';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {chunks,INDEX_VERSION} from '../../apps/api/src/retrieval.ts';
import {DIMENSIONS,type EmbeddingProvider} from '../../apps/api/src/embeddings.ts';

export const GOLDEN_DIR='tests/fixtures/retrieval-golden-v1';
export const SEARCH_LIMIT=5;

export type Runbook={id:string,workspace:'north'|'south',category:'operations'|'recovery'|'security',title:string,body:string,status?:'withdrawn',revision?:{body:string},obsoleteEvidence?:string};
export type Relevant={runbook:string,grade:1|2,evidence:string};
export type Query={id:string,split:'development'|'held-out',type:string,lang:'en'|'es',q:string,relevant?:Relevant[],noAnswer?:true};
export type Corpus={version:string,runbooks:Runbook[]};
export type Queries={version:string,queries:Query[]};
export type Purpose='document'|'query';
export type Manifest={version:string,model:string,digest:string,dimensions:number,indexVersion:string,chunkerSha256:string,corpusSha256:string,queriesSha256:string,runtime:string,recordedAt:string,hardware:string,synthetic?:boolean};
export type Recording={manifest:Manifest,vectors:Record<string,string>};

const sha256=(text:string|Buffer)=>createHash('sha256').update(text).digest('hex');
/** The chunker is part of the recording: if its code changes, chunk texts and their vectors no longer match. */
export const chunkerSha256=()=>sha256(chunks.toString()+'\n'+INDEX_VERSION);
export const embeddingKey=(purpose:Purpose,text:string)=>sha256(purpose+'\n'+text);

export function loadGolden(dir=GOLDEN_DIR){
  const corpusRaw=readFileSync(join(dir,'corpus.json')),queriesRaw=readFileSync(join(dir,'queries.json'));
  const recordingPath=join(dir,'embeddings.json'),baselinePath=join(dir,'baseline.json');
  return {
    corpus:JSON.parse(corpusRaw.toString('utf8')) as Corpus,
    queries:JSON.parse(queriesRaw.toString('utf8')) as Queries,
    corpusSha256:sha256(corpusRaw),queriesSha256:sha256(queriesRaw),
    recording:existsSync(recordingPath)?JSON.parse(readFileSync(recordingPath,'utf8')) as Recording:null,
    baseline:existsSync(baselinePath)?JSON.parse(readFileSync(baselinePath,'utf8')) as Baseline:null,
  };
}

/** Every body that gets indexed at some point: published versions, the superseded version and the withdrawn runbook. */
export const indexedBodies=(corpus:Corpus)=>corpus.runbooks.flatMap(r=>r.revision?[r.body,r.revision.body]:[r.body]);
export const publishedBody=(r:Runbook)=>r.revision?.body??r.body;

/** Texts the desktop recording must embed, with their purpose, deduplicated. */
export function recordingInputs(corpus:Corpus,queries:Queries){
  const seen=new Set<string>(),inputs:{purpose:Purpose,text:string}[]=[];
  const add=(purpose:Purpose,text:string)=>{const key=embeddingKey(purpose,text);if(!seen.has(key)){seen.add(key);inputs.push({purpose,text});}};
  for(const body of indexedBodies(corpus))for(const part of chunks(body))add('document',part.text);
  for(const q of queries.queries)add('query',q.q);
  return inputs;
}

/** Dataset problems that would make the golden set lie. Empty means valid. */
export function datasetIssues(corpus:Corpus,queries:Queries):string[]{
  const issues:string[]=[];
  const byId=new Map(corpus.runbooks.map(r=>[r.id,r]));
  if(byId.size!==corpus.runbooks.length)issues.push('duplicate runbook ids');
  for(const r of corpus.runbooks){
    if(r.title.length<5||r.title.length>120)issues.push(`${r.id}: title length`);
    for(const body of r.revision?[r.body,r.revision.body]:[r.body]){
      if(body.length<10||body.length>10000)issues.push(`${r.id}: body length`);
      try{chunks(body);}catch{issues.push(`${r.id}: body exceeds the chunk budget`);}
    }
    if(r.obsoleteEvidence&&(!r.body.includes(r.obsoleteEvidence)||publishedBody(r).includes(r.obsoleteEvidence)))issues.push(`${r.id}: obsolete evidence must exist only in the superseded version`);
  }
  if(corpus.version!==queries.version)issues.push('corpus and queries versions differ');
  const ids=new Set<string>();
  for(const q of queries.queries){
    if(ids.has(q.id))issues.push(`${q.id}: duplicate id`);ids.add(q.id);
    if(!q.q.trim()||q.q.length>200)issues.push(`${q.id}: query length`);
    if(Boolean(q.noAnswer)===Boolean(q.relevant?.length))issues.push(`${q.id}: needs either relevant runbooks or noAnswer`);
    const answers=(q.relevant??[]).filter(r=>r.grade===2);
    if(q.relevant&&answers.length!==1)issues.push(`${q.id}: exactly one grade-2 runbook`);
    for(const rel of q.relevant??[]){
      const r=byId.get(rel.runbook);
      if(!r){issues.push(`${q.id}: unknown runbook ${rel.runbook}`);continue;}
      if(r.workspace!=='north'||r.status==='withdrawn')issues.push(`${q.id}: ${rel.runbook} is not retrievable by the north reporter`);
      if(!publishedBody(r).includes(rel.evidence))issues.push(`${q.id}: evidence not found verbatim in ${rel.runbook}`);
    }
  }
  for(const split of ['development','held-out'] as const){
    const rows=queries.queries.filter(q=>q.split===split);
    if(!rows.some(q=>q.noAnswer)||!rows.some(q=>!q.noAnswer))issues.push(`${split}: needs answerable and no-answer queries`);
  }
  return issues;
}

export const encodeVector=(vector:number[])=>Buffer.from(new Float32Array(vector).buffer).toString('base64');
export function decodeVector(value:string):number[]{
  const bytes=Buffer.from(value,'base64');
  if(bytes.byteLength!==DIMENSIONS*4)throw new Error('Recorded vector has the wrong size');
  return Array.from(new Float32Array(bytes.buffer,bytes.byteOffset,DIMENSIONS));
}

/** Problems that make a recording unusable for the current dataset and chunker. Empty means it can be replayed. */
export function recordingIssues(recording:Recording,golden:{corpusSha256:string,queriesSha256:string,corpus:Corpus,queries:Queries}):string[]{
  const m=recording.manifest,issues:string[]=[];
  if(m.version!==golden.corpus.version)issues.push(`recorded for ${m.version}, dataset is ${golden.corpus.version}`);
  if(m.corpusSha256!==golden.corpusSha256)issues.push('corpus.json changed after recording');
  if(m.queriesSha256!==golden.queriesSha256)issues.push('queries.json changed after recording');
  if(m.chunkerSha256!==chunkerSha256())issues.push('the chunker changed after recording');
  if(m.indexVersion!==INDEX_VERSION||m.dimensions!==DIMENSIONS)issues.push('index version or dimensions changed');
  if(!/^sha256:[a-f0-9]{64}$/.test(m.digest))issues.push('model digest is not pinned');
  const missing=recordingInputs(golden.corpus,golden.queries).filter(i=>!recording.vectors[embeddingKey(i.purpose,i.text)]).length;
  if(missing)issues.push(`${missing} recorded vectors missing`);
  return issues;
}

/** Embedding provider that replays recorded vectors exactly; anything not recorded is an error, never a guess. */
export function replayProvider(recording:Recording):EmbeddingProvider{
  return {
    model:recording.manifest.model,
    digest:recording.manifest.digest,
    async embed(inputs,purpose){
      return inputs.map(text=>{
        const value=recording.vectors[embeddingKey(purpose,text)];
        if(!value)throw new Error(`No recorded ${purpose} vector for this text; record the golden set again`);
        return decodeVector(value);
      });
    },
  };
}

export type RankedHit={runbook:string,text:string,score:number};
export type QueryResult={id:string,split:Query['split'],type:string,lang:Query['lang'],noAnswer:boolean,rank:number,ndcg5:number,spanHit:boolean,topScore:number,keywordRank:number,hits:{runbook:string,score:number}[]};

/** Graded nDCG@5 over distinct runbooks: repeated chunks of a runbook already seen add no gain. */
export function ndcgAt5(hits:RankedHit[],relevant:Relevant[]){
  const grade=new Map(relevant.map(r=>[r.runbook,r.grade]));
  const seen=new Set<string>();let dcg=0;
  hits.slice(0,SEARCH_LIMIT).forEach((h,i)=>{if(seen.has(h.runbook))return;seen.add(h.runbook);const g=grade.get(h.runbook)??0;dcg+=(2**g-1)/Math.log2(i+2);});
  const ideal=[...relevant.map(r=>r.grade)].sort((a,b)=>b-a).slice(0,SEARCH_LIMIT).reduce((n,g,i)=>n+(2**g-1)/Math.log2(i+2),0);
  return ideal?dcg/ideal:0;
}

export function evaluateQuery(q:Query,hits:RankedHit[],keywordRank:number):QueryResult{
  const answer=q.relevant?.find(r=>r.grade===2);
  const rank=answer?hits.findIndex(h=>h.runbook===answer.runbook)+1:0;
  return {
    id:q.id,split:q.split,type:q.type,lang:q.lang,noAnswer:Boolean(q.noAnswer),rank,
    ndcg5:q.relevant?ndcgAt5(hits,q.relevant):0,
    spanHit:Boolean(answer&&hits.slice(0,SEARCH_LIMIT).some(h=>h.runbook===answer.runbook&&h.text.includes(answer.evidence))),
    topScore:hits[0]?.score??0,keywordRank,
    hits:hits.map(h=>({runbook:h.runbook,score:Math.round(h.score*1e6)/1e6})),
  };
}

const mean=(values:number[])=>values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
const round=(n:number)=>Math.round(n*1e4)/1e4;

export type Metrics={n:number,recallAt1:number,recallAt3:number,recallAt5:number,mrr:number,ndcg5:number,spanHitAt5:number,keywordRecallAt5:number,keywordMrr:number};
export function metrics(rows:QueryResult[]):Metrics{
  const a=rows.filter(r=>!r.noAnswer);
  const at=(k:number)=>round(mean(a.map(r=>r.rank>0&&r.rank<=k?1:0)));
  return {n:a.length,recallAt1:at(1),recallAt3:at(3),recallAt5:at(5),mrr:round(mean(a.map(r=>r.rank?1/r.rank:0))),ndcg5:round(mean(a.map(r=>r.ndcg5))),
    spanHitAt5:round(mean(a.map(r=>r.spanHit?1:0))),keywordRecallAt5:round(mean(a.map(r=>r.keywordRank>0&&r.keywordRank<=5?1:0))),keywordMrr:round(mean(a.map(r=>r.keywordRank?1/r.keywordRank:0)))};
}

/**
 * Abstention threshold on the top cosine score, tuned on development only: the midpoint that maximises balanced
 * accuracy between keeping answerable queries and abstaining on no-answer ones (lowest threshold on ties).
 */
export function tuneThreshold(rows:QueryResult[]){
  const scores=[...new Set(rows.map(r=>r.topScore))].sort((a,b)=>a-b);
  const candidates=[0,...scores.slice(1).map((s,i)=>(s+scores[i]!)/2),scores.at(-1)!+1e-6];
  let best={threshold:0,balancedAccuracy:-1};
  for(const t of candidates){const b=abstention(rows,t).balancedAccuracy;if(b>best.balancedAccuracy+1e-12)best={threshold:t,balancedAccuracy:b};}
  return {threshold:Math.round(best.threshold*1e6)/1e6,balancedAccuracy:round(best.balancedAccuracy)};
}
export function abstention(rows:QueryResult[],threshold:number){
  const abstained=rows.filter(r=>r.topScore<threshold),none=rows.filter(r=>r.noAnswer),answerable=rows.filter(r=>!r.noAnswer);
  const correct=abstained.filter(r=>r.noAnswer).length;
  const noAnswerRecall=none.length?correct/none.length:0,answerableCoverage=answerable.length?answerable.filter(r=>r.topScore>=threshold).length/answerable.length:0;
  return {abstained:abstained.length,precision:round(abstained.length?correct/abstained.length:1),noAnswerRecall:round(noAnswerRecall),answerableCoverage:round(answerableCoverage),balancedAccuracy:round((noAnswerRecall+answerableCoverage)/2)};
}

export function breakdown(rows:QueryResult[],key:'type'|'lang'){
  const groups=[...new Set(rows.filter(r=>!r.noAnswer).map(r=>r[key]))].sort();
  return Object.fromEntries(groups.map(g=>[g,metrics(rows.filter(r=>r[key]===g))]));
}

export type Baseline={version:string,digest:string,heldOut:Metrics,development:Metrics,heldOutAbstention:ReturnType<typeof abstention>};
const GATED:(keyof Metrics)[]=['recallAt1','recallAt3','recallAt5','mrr','ndcg5','spanHitAt5'];
/** Retrieval with replayed vectors is deterministic, so any drop below the committed baseline is a regression. */
export function regressions(current:Baseline,baseline:Baseline){
  const out:string[]=[];
  for(const split of ['development','heldOut'] as const)for(const k of GATED)if(current[split][k]<baseline[split][k]-1e-9)out.push(`${split}.${k}: ${current[split][k]} < baseline ${baseline[split][k]}`);
  for(const k of ['noAnswerRecall','answerableCoverage'] as const)if(current.heldOutAbstention[k]<baseline.heldOutAbstention[k]-1e-9)out.push(`heldOutAbstention.${k}: ${current.heldOutAbstention[k]} < baseline ${baseline.heldOutAbstention[k]}`);
  return out;
}
