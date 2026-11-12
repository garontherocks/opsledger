import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { testDatabase } from './database.ts';
import { seedLab, NORTH, SOUTH } from '../scripts/seed.ts';
import { Knowledge } from '../apps/api/src/knowledge.ts';
import { Retrieval } from '../apps/api/src/retrieval.ts';
import { SemanticQuery } from '../packages/contracts/src/retrieval.ts';
import { ATTR } from '../apps/api/src/telemetry.ts';
import { memoryTracing, toJsonl } from '../scripts/telemetry/memory-tracing.ts';
import {
  abstention,
  breakdown,
  datasetIssues,
  evaluateQuery,
  loadGolden,
  metrics,
  recordingIssues,
  regressions,
  replayProvider,
  tuneThreshold,
  SEARCH_LIMIT,
  type Baseline,
  type QueryResult,
  type RankedHit,
  type Recording,
} from '../scripts/retrieval-golden/golden.ts';

// Replays embeddings recorded on the desktop with the pinned model against the production index and search
// path on PostgreSQL + pgvector. Retrieval is exact cosine, so the ranking is deterministic. See docs/retrieval-golden.md.
const golden = loadGolden();
// GOLDEN_RECORDING points at a local, never-committed recording (for example synthetic vectors) to check the plumbing.
const override = process.env.GOLDEN_RECORDING;
const recording: Recording | null = override
  ? (JSON.parse(readFileSync(override, 'utf8')) as Recording)
  : golden.recording;
const official = !override && !recording?.manifest.synthetic;
const pending = recording ? false : 'embeddings not recorded yet: run `npm run rag:golden:record` on the desktop';

test('golden dataset is valid', () => {
  assert.deepEqual(datasetIssues(golden.corpus, golden.queries), []);
});

test('retrieval golden set replayed on PostgreSQL', { skip: pending }, async t => {
  const rec = recording!;
  await t.test('the recording matches the dataset, the chunker and a pinned model digest', () => {
    assert.deepEqual(recordingIssues(rec, golden), []);
  });
  const db = await testDatabase(55471);
  try {
    await seedLab(db.pool, crypto.randomUUID() + '-Pass9!');
    const knowledge = new Knowledge(db.pool, 'synthetic-secret');
    const retrieval = new Retrieval(db.pool, 'synthetic-secret', replayProvider(rec));
    const tracing = memoryTracing();
    const goldenId = new Map<string, string>();
    // Every runbook goes through the production write, publish and index path.
    for (const r of golden.corpus.runbooks) {
      const [editor, workspace] = r.workspace === 'north' ? ['north-editor', NORTH] : ['south-editor', SOUTH];
      let v = await knowledge.write(editor, workspace, { title: r.title, body: r.body, category: r.category });
      v = await knowledge.write(editor, workspace, { expectedRevision: v.revision }, v.id, {
        action: 'publish',
        number: v.number,
      });
      await retrieval.index(editor, workspace, v.id, v.revision);
      goldenId.set(v.id, r.id);
      if (r.revision) {
        v = await knowledge.write(
          editor,
          workspace,
          { expectedRevision: v.revision, title: r.title, body: r.revision.body, category: r.category },
          v.id,
        );
        v = await knowledge.write(editor, workspace, { expectedRevision: v.revision }, v.id, {
          action: 'publish',
          number: v.number,
        });
        await retrieval.index(editor, workspace, v.id, v.revision);
      }
      if (r.status === 'withdrawn')
        await knowledge.write(editor, workspace, { expectedRevision: v.revision }, v.id, {
          action: 'withdraw',
          number: v.number,
        });
    }

    const results: QueryResult[] = [],
      leaks: string[] = [];
    const obsolete = golden.corpus.runbooks.filter(r => r.obsoleteEvidence).map(r => r.obsoleteEvidence!);
    const hidden = new Set(
      golden.corpus.runbooks.filter(r => r.workspace !== 'north' || r.status === 'withdrawn').map(r => r.id),
    );
    for (const q of golden.queries.queries) {
      const hits = await retrieval.search(
        'north-reporter',
        NORTH,
        SemanticQuery.parse({ q: q.q, limit: SEARCH_LIMIT }),
      );
      const ranked: RankedHit[] = hits.map(h => ({
        runbook: goldenId.get(h.runbookId) ?? 'unknown',
        text: h.text,
        score: h.score,
      }));
      for (const h of ranked) {
        if (hidden.has(h.runbook) || h.runbook === 'unknown') leaks.push(`${q.id} returned ${h.runbook}`);
        if (obsolete.some(text => h.text.includes(text))) leaks.push(`${q.id} returned superseded text`);
      }
      // Keyword baseline: any query term, ranked by ts_rank_cd over the same published north runbooks.
      // Ties break on the title, which is unique: runbook ids are random per run and would make the baseline vary.
      const terms = [...new Set(q.q.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])];
      const keyword = terms.length
        ? ((
            await db.pool.query(
              `SELECT r.id FROM runbooks r JOIN runbook_versions v ON v.runbook_id=r.id AND v.number=r.published_version
        WHERE r.workspace_id=$1 AND v.status='published' AND v.search_vector @@ to_tsquery('simple',$2) ORDER BY ts_rank_cd(v.search_vector,to_tsquery('simple',$2)) DESC,v.title LIMIT ${SEARCH_LIMIT}`,
              [NORTH, terms.join(' | ')],
            )
          ).rows as { id: string }[])
        : [];
      const answer = q.relevant?.find(r => r.grade === 2)?.runbook;
      const keywordRank = answer ? keyword.findIndex(row => goldenId.get(row.id) === answer) + 1 : 0;
      results.push(evaluateQuery(q, ranked, keywordRank));
    }

    const development = results.filter(r => r.split === 'development'),
      heldOut = results.filter(r => r.split === 'held-out');
    const tuned = tuneThreshold(development);
    const current: Baseline = {
      version: golden.corpus.version,
      digest: rec.manifest.digest,
      development: metrics(development),
      heldOut: metrics(heldOut),
      heldOutAbstention: abstention(heldOut, tuned.threshold),
    };
    const report = {
      at: new Date().toISOString(),
      dataset: golden.corpus.version,
      official,
      recording: { ...rec.manifest },
      method:
        'Embeddings recorded on the desktop with the pinned model, replayed through the production index and exact-cosine search on PostgreSQL + pgvector. Keyword baseline: any query term, ranked by ts_rank_cd.',
      development: current.development,
      heldOut: current.heldOut,
      abstention: {
        tunedOn: 'development',
        threshold: tuned.threshold,
        development: abstention(development, tuned.threshold),
        heldOut: current.heldOutAbstention,
      },
      byType: breakdown(results, 'type'),
      byLanguage: breakdown(results, 'lang'),
      leaks,
      results,
      limitations: [
        'Small synthetic corpus written for this test, not production runbooks',
        'One embedding model and one recording; no confidence intervals',
        'Retrieval quality only: generation and citation faithfulness are evaluated elsewhere',
      ],
    };
    const path = official ? 'evidence/phase21-retrieval-golden.json' : '.local/phase21-retrieval-golden.json';
    mkdirSync(official ? 'evidence' : '.local', { recursive: true });
    writeFileSync(path, JSON.stringify(report, null, 2) + '\n');

    await t.test('index and search emit embeddings and retrieval spans without query or chunk text', () => {
      const spans = tracing.spans();
      const op = (name: string) => spans.filter(s => s.attributes[ATTR.operation] === name);
      const searches = op('retrieval');
      assert.equal(searches.length, golden.queries.queries.length);
      const embeddings = op('embeddings');
      assert.ok(embeddings.some(s => s.attributes['opsledger.embeddings.purpose'] === 'document'));
      for (const search of searches) {
        assert.equal(search.attributes[ATTR.dataSource], 'opsledger-knowledge');
        assert.equal(search.attributes[ATTR.topK], SEARCH_LIMIT);
        assert.equal(typeof search.attributes['opsledger.retrieval.hits'], 'number');
        const children = embeddings.filter(e => e.parentSpanContext?.spanId === search.spanContext().spanId);
        assert.equal(children.length, 1);
        assert.equal(children[0]!.attributes['opsledger.embeddings.purpose'], 'query');
        assert.equal(children[0]!.attributes[ATTR.requestModel], rec.manifest.model);
      }
      const exported = toJsonl(spans);
      for (const q of golden.queries.queries) assert.ok(!exported.includes(JSON.stringify(q.q).slice(1, -1)), q.id);
      for (const r of golden.corpus.runbooks) assert.ok(!exported.includes(r.body.slice(0, 40)), r.id);
    });
    await t.test('search never returns withdrawn, superseded or other-workspace content', () => {
      assert.deepEqual(leaks, []);
    });
    await t.test(
      'metrics hold the committed baseline',
      { skip: golden.baseline && official ? false : 'no committed baseline for this recording yet' },
      () => {
        const baseline = golden.baseline!;
        assert.equal(baseline.digest, rec.manifest.digest, 'the baseline was measured with another model digest');
        assert.deepEqual(regressions(current, baseline), []);
      },
    );
  } finally {
    await db.close();
  }
});
