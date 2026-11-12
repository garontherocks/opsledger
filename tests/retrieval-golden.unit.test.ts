import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  abstention,
  contentSha256,
  datasetIssues,
  decodeVector,
  encodeVector,
  evaluateQuery,
  embeddingKey,
  loadGolden,
  metrics,
  ndcgAt5,
  recordingInputs,
  recordingIssues,
  regressions,
  replayProvider,
  tuneThreshold,
  chunkerSha256,
  type Baseline,
  type Query,
  type QueryResult,
  type Recording,
} from '../scripts/retrieval-golden/golden.ts';
import { DIMENSIONS } from '../apps/api/src/embeddings.ts';
import { INDEX_VERSION } from '../apps/api/src/retrieval.ts';

const golden = loadGolden();
const q = (overrides: Partial<Query>): Query => ({
  id: 'x',
  split: 'development',
  type: 'paraphrase',
  lang: 'en',
  q: 'query',
  relevant: [{ runbook: 'r01', grade: 2, evidence: 'promote' }],
  ...overrides,
});
const row = (overrides: Partial<QueryResult>): QueryResult => ({
  id: 'x',
  split: 'development',
  type: 't',
  lang: 'en',
  noAnswer: false,
  rank: 1,
  ndcg5: 1,
  spanHit: true,
  topScore: 0.8,
  keywordRank: 0,
  hits: [],
  ...overrides,
});

test('the committed golden dataset is valid and covers every query type and both languages', () => {
  assert.deepEqual(datasetIssues(golden.corpus, golden.queries), []);
  const types = new Set(golden.queries.queries.map(x => x.type));
  for (const t of [
    'lexical',
    'paraphrase',
    'cross-lingual',
    'hard-negative',
    'symptom',
    'multi-chunk',
    'superseded',
    'no-answer',
  ])
    assert.ok(types.has(t), t);
  assert.deepEqual([...new Set(golden.queries.queries.map(x => x.lang))].sort(), ['en', 'es']);
});

test('dataset validation catches evidence that is not verbatim and queries without an answer key', () => {
  const queries = {
    ...golden.queries,
    queries: [
      q({ relevant: [{ runbook: 'r01', grade: 2, evidence: 'not in the runbook' }] }),
      q({ id: 'y', relevant: [] }),
      q({ id: 'z', relevant: [{ runbook: 'r20', grade: 2, evidence: 'South' }] }),
    ],
  };
  const issues = datasetIssues(golden.corpus, queries);
  assert.ok(issues.some(i => i.includes('evidence not found verbatim')));
  assert.ok(issues.some(i => i.includes('needs either relevant runbooks or noAnswer')));
  assert.ok(issues.some(i => i.includes('not retrievable by the north reporter')));
});

test('rank, span hit and graded nDCG@5 follow the answer key', () => {
  const query = q({
    relevant: [
      { runbook: 'r02', grade: 2, evidence: 'checksum' },
      { runbook: 'r17', grade: 1, evidence: 'dump' },
    ],
  });
  const result = evaluateQuery(
    query,
    [
      { runbook: 'r03', text: 'bucket', score: 0.9 },
      { runbook: 'r02', text: 'verify the checksum', score: 0.8 },
      { runbook: 'r02', text: 'more', score: 0.7 },
    ],
    3,
  );
  assert.equal(result.rank, 2);
  assert.equal(result.spanHit, true);
  assert.equal(result.topScore, 0.9);
  assert.equal(result.keywordRank, 3);
  // Ideal: grade 2 then grade 1. Actual: miss, grade 2, repeat of r02 (no gain).
  const ideal = 3 / Math.log2(2) + 1 / Math.log2(3),
    actual = 3 / Math.log2(3);
  assert.ok(
    Math.abs(
      ndcgAt5(
        [
          { runbook: 'r03', text: '', score: 1 },
          { runbook: 'r02', text: '', score: 1 },
          { runbook: 'r02', text: '', score: 1 },
        ],
        query.relevant!,
      ) -
        actual / ideal,
    ) < 1e-12,
  );
  assert.equal(evaluateQuery(query, [{ runbook: 'r02', text: 'no evidence here', score: 0.5 }], 0).spanHit, false);
});

test('metrics average answerable queries only', () => {
  const m = metrics([
    row({ rank: 1 }),
    row({ rank: 3, spanHit: false, ndcg5: 0.5 }),
    row({ rank: 0, ndcg5: 0, spanHit: false }),
    row({ noAnswer: true, rank: 0 }),
  ]);
  assert.equal(m.n, 3);
  assert.equal(m.recallAt1, 0.3333);
  assert.equal(m.recallAt3, 0.6667);
  assert.equal(m.mrr, Math.round(((1 + 1 / 3) / 3) * 1e4) / 1e4);
  assert.equal(m.spanHitAt5, 0.3333);
});

test('the abstention threshold is tuned on development and measured as given', () => {
  const dev = [
    row({ topScore: 0.82 }),
    row({ topScore: 0.71 }),
    row({ noAnswer: true, topScore: 0.55 }),
    row({ noAnswer: true, topScore: 0.63 }),
  ];
  const tuned = tuneThreshold(dev);
  assert.equal(tuned.threshold, 0.67);
  assert.equal(tuned.balancedAccuracy, 1);
  const held = abstention(
    [row({ topScore: 0.66 }), row({ noAnswer: true, topScore: 0.6 }), row({ noAnswer: true, topScore: 0.7 })],
    tuned.threshold,
  );
  assert.deepEqual(held, {
    abstained: 2,
    precision: 0.5,
    noAnswerRecall: 0.5,
    answerableCoverage: 0,
    balancedAccuracy: 0.25,
  });
});

test('any drop below the baseline is a regression', () => {
  const m = metrics([row({ rank: 1 })]);
  const base: Baseline = {
    version: 'v',
    digest: 'd',
    development: m,
    heldOut: m,
    heldOutAbstention: { abstained: 1, precision: 1, noAnswerRecall: 1, answerableCoverage: 1, balancedAccuracy: 1 },
  };
  assert.deepEqual(regressions(base, base), []);
  const worse = {
    ...base,
    heldOut: { ...m, recallAt1: 0.5 },
    heldOutAbstention: { ...base.heldOutAbstention, noAnswerRecall: 0.5 },
  };
  assert.deepEqual(regressions(worse, base), [
    'heldOut.recallAt1: 0.5 < baseline 1',
    'heldOutAbstention.noAnswerRecall: 0.5 < baseline 1',
  ]);
});

test('recorded vectors round-trip through float32 exactly as pgvector stores them', () => {
  const v = Array.from({ length: DIMENSIONS }, (_, i) => Math.sin(i) / 7);
  const back = decodeVector(encodeVector(v));
  assert.equal(back.length, DIMENSIONS);
  assert.deepEqual(back, Array.from(new Float32Array(v)));
  assert.throws(() => decodeVector(encodeVector([1, 2, 3])), /wrong size/);
});

function syntheticRecording(): Recording {
  const vectors: Record<string, string> = {};
  for (const i of recordingInputs(golden.corpus, golden.queries))
    vectors[embeddingKey(i.purpose, i.text)] = encodeVector(
      Array.from({ length: DIMENSIONS }, (_, j) => (j === 0 ? 1 : 0)),
    );
  return {
    manifest: {
      version: golden.corpus.version,
      model: 'm',
      digest: 'sha256:' + 'a'.repeat(64),
      dimensions: DIMENSIONS,
      indexVersion: INDEX_VERSION,
      chunkerSha256: chunkerSha256(),
      corpusSha256: golden.corpusSha256,
      queriesSha256: golden.queriesSha256,
      runtime: 'r',
      recordedAt: 't',
      hardware: 'h',
      synthetic: true,
    },
    vectors,
  };
}

test('a stale or incomplete recording is rejected with the reason', () => {
  const rec = syntheticRecording();
  assert.deepEqual(recordingIssues(rec, golden), []);
  const stale = { ...rec, manifest: { ...rec.manifest, corpusSha256: '0', chunkerSha256: '0', digest: 'latest' } };
  assert.deepEqual(recordingIssues(stale, golden), [
    'corpus.json changed after recording',
    'the chunker changed after recording',
    'model digest is not pinned',
  ]);
  const [first] = Object.keys(rec.vectors);
  const partial = { ...rec, vectors: Object.fromEntries(Object.entries(rec.vectors).filter(([k]) => k !== first)) };
  assert.deepEqual(recordingIssues(partial, golden), ['1 recorded vectors missing']);
});

test('dataset and chunker hashes ignore line endings and formatting', () => {
  const raw = readFileSync('tests/fixtures/retrieval-golden-v1/corpus.json', 'utf8');
  assert.equal(contentSha256(raw.replace(/\n/g, '\r\n')), golden.corpusSha256, 'a CRLF checkout hashes the same');
  assert.equal(
    contentSha256(JSON.stringify(JSON.parse(raw), null, 4)),
    golden.corpusSha256,
    'reformatting is not a content change',
  );
  assert.notEqual(
    contentSha256(raw.replace('PostgreSQL primary failover', 'PostgreSQL failover')),
    golden.corpusSha256,
  );
});

test('the replay provider returns recorded vectors and never guesses', async () => {
  const rec = syntheticRecording();
  const provider = replayProvider(rec);
  assert.equal(provider.digest, 'sha256:' + 'a'.repeat(64));
  const [vector] = await provider.embed([golden.queries.queries[0]!.q], 'query');
  assert.equal(vector!.length, DIMENSIONS);
  await assert.rejects(provider.embed(['a text nobody recorded'], 'query'), /record the golden set again/);
  await assert.rejects(provider.embed([golden.queries.queries[0]!.q], 'document'), /No recorded document vector/);
});
