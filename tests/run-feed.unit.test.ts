import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SKILLS, STEP_COMMANDS } from '../scripts/run-feed/catalog.ts';
import {
  buildFeed,
  evalCases,
  coverageCheck,
  goldenCheck,
  leafNodeTests,
  mergeHistory,
  playwrightTests,
  recordedLocal,
  FEED_SCHEMA,
  HISTORY_SCHEMA,
  type BuildInput,
  type NodeRecord,
} from '../scripts/run-feed/build-run-feed.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const run = {
  id: '1',
  number: 7,
  attempt: 1,
  workflow: 'ci',
  event: 'push',
  branch: 'main',
  commit: 'abc',
  repository: 'garontherocks/opsledger',
  url: 'https://example.test/run/1',
};
const input = (overrides: Partial<BuildInput>): BuildInput => ({
  nodeTests: [],
  steps: [],
  browser: [],
  evals: [],
  lanes: [],
  retrieval: null,
  run,
  generatedAt: '2026-11-12T00:00:00.000Z',
  node: 'v24.19.0',
  recorded: [],
  ...overrides,
});
const node = (
  file: string,
  name: string,
  path: string[] = [],
  status: NodeRecord['status'] = 'passed',
  kind = 'test',
): NodeRecord => ({ lane: 'api', file: 'tests/' + file, path, name, kind, status, durationMs: 5 });

test('every CI test file, browser flow and step belongs to exactly one skill', () => {
  const files = readdirSync(join(root, 'tests')).filter(f => f.endsWith('.test.ts'));
  const flows = readdirSync(join(root, 'tests', 'browser'))
    .filter(f => f.endsWith('.spec.ts'))
    .map(f => f.replace(/\.spec\.ts$/, ''));
  const owners = (pick: (s: (typeof SKILLS)[number]) => string[], item: string) =>
    SKILLS.filter(s => pick(s).includes(item)).map(s => s.id);
  for (const f of files) assert.equal(owners(s => s.files, f).length, 1, `${f} must map to exactly one skill`);
  for (const f of flows)
    assert.equal(owners(s => s.flows, f).length, 1, `browser flow ${f} must map to exactly one skill`);
  for (const step of Object.keys(STEP_COMMANDS))
    assert.equal(owners(s => s.steps, step).length, 1, `step ${step} must map to exactly one skill`);
  assert.equal(new Set(SKILLS.map(s => s.id)).size, SKILLS.length);
  for (const s of SKILLS) assert.ok(['deterministic', 'fixture', 'recorded'].includes(s.provenance));
});

test('only leaf tests count: describe blocks and tests with subtests are containers', () => {
  const leaves = leafNodeTests([
    node('a.test.ts', 'adds', ['suite A']),
    node('a.test.ts', 'suite A'),
    node('b.test.ts', 'works', ['B']),
    node('b.test.ts', 'B', [], 'passed', 'suite'),
    node('c.test.ts', 'top level'),
  ]);
  assert.deepEqual(
    leaves.map(l => l.name),
    ['adds', 'works', 'top level'],
  );
});

test('Playwright: last attempt, retry count and flakiness', () => {
  const report = {
    suites: [
      {
        title: 'qa.spec.ts',
        file: 'qa.spec.ts',
        specs: [],
        suites: [
          {
            title: 'Approval',
            specs: [
              {
                title: 'approves once',
                file: 'tests/browser/qa.spec.ts',
                tests: [
                  {
                    results: [
                      { status: 'failed', duration: 10 },
                      { status: 'passed', duration: 20 },
                    ],
                  },
                ],
              },
              {
                title: 'denies stale',
                file: 'tests/browser/qa.spec.ts',
                tests: [{ results: [{ status: 'timedOut', duration: 30 }] }],
              },
            ],
          },
        ],
      },
    ],
  };
  const tests = playwrightTests(report, 'browser');
  assert.deepEqual(
    tests.map(t => [t.flow, t.test.group, t.test.name, t.test.status, t.test.retries, t.flaky]),
    [
      ['qa', 'Approval', 'approves once', 'passed', 1, true],
      ['qa', 'Approval', 'denies stale', 'failed', 0, false],
    ],
  );
  assert.equal(tests[0]!.test.durationMs, 20);
});

test('eval reports expand into one entry per case', () => {
  const agent = evalCases(
    'agent-eval',
    {
      results: [
        { id: 's1', split: 'heldout', expectedMatched: true },
        { id: 's2', expectedMatched: false },
      ],
    },
    'api',
  );
  assert.deepEqual(
    agent.map(t => [t.group, t.name, t.status]),
    [
      ['Agent eval · heldout', 'case s1', 'passed'],
      ['Agent eval', 'case s2', 'failed'],
    ],
  );
  const promptfoo = evalCases(
    'ai-regression',
    { outputs: [{ caseId: 'inj-1', surface: 'summary', boundaryExpectationMet: true }] },
    'api',
  );
  assert.deepEqual(
    promptfoo.map(t => [t.group, t.name, t.status]),
    [['Promptfoo · summary', 'case inj-1', 'passed']],
  );
  assert.deepEqual(evalCases('unknown', {}, 'api'), []);
});

test('feed groups results by skill with provenance, lanes and totals', () => {
  const feed = buildFeed(
    input({
      nodeTests: [
        node('rag.integration.test.ts', 'cites the runbook', ['rag']),
        node('rag.integration.test.ts', 'rag'),
        node('qa-mcp.integration.test.ts', 'lists tools', [], 'failed'),
        node('unknown.test.ts', 'new thing'),
      ],
      steps: [
        { lane: 'api', step: 'audit-gate', status: 'passed', durationMs: 1000, startedAt: '2026-11-12T00:00:10.000Z' },
        { lane: 'api', step: 'm2-harness', status: 'passed', durationMs: 0, startedAt: '2026-11-12T00:00:20.000Z' },
      ],
      lanes: [{ lane: 'api', startedAt: '2026-11-12T00:00:00.000Z', finishedAt: '2026-11-12T00:01:00.000Z' }],
      retrieval: { lane: 'api', recallAt5: 1, mrr: 0.5 },
    }),
  );
  assert.equal(feed.schema, FEED_SCHEMA);
  assert.deepEqual(feed.totals, { tests: 5, passed: 4, failed: 1, skipped: 0, flaky: 0, durationMs: 1015 });
  const byId = Object.fromEntries(feed.suites.map(s => [s.id, s]));
  assert.equal(byId['rag-retrieval']!.provenance, 'fixture');
  assert.equal(byId['rag-retrieval']!.tests[0]!.group, 'rag');
  assert.equal(byId['mcp-contract']!.provenance, 'deterministic');
  assert.equal(byId['mcp-contract']!.totals.failed, 1);
  assert.equal(byId['supply-chain']!.tests[0]!.group, 'CI step');
  assert.equal(byId['other']!.tests[0]!.name, 'new thing', 'unmapped results stay visible instead of disappearing');
  assert.deepEqual(
    byId['mcp-contract']!.targets.map(t => t.name),
    ['API lane · PostgreSQL 18.6 + pgvector'],
  );
  assert.deepEqual(feed.window, {
    startedAt: '2026-11-12T00:00:00.000Z',
    finishedAt: '2026-11-12T00:01:00.000Z',
    wallMs: 60000,
  });
  assert.deepEqual(feed.checks.retrieval, { recallAt5: 1, mrr: 0.5, source: 'fixture' });
  assert.equal(feed.reports.history, './history.json');
});

test('eval reports and retrieval metrics count only in the lane where their step ran', () => {
  const report = { results: [{ id: 's1', expectedMatched: true }] };
  const feed = buildFeed(
    input({
      steps: [
        { lane: 'api', step: 'agent-eval', status: 'passed', durationMs: 1, startedAt: '2026-11-12T00:00:00.000Z' },
      ],
      evals: [
        { step: 'agent-eval', lane: 'api', report },
        { step: 'agent-eval', lane: 'browser', report },
      ],
      retrieval: { lane: 'browser', recallAt5: 1, mrr: 1 },
    }),
  );
  const agent = feed.suites.find(s => s.id === 'agent-budgets')!;
  assert.equal(
    agent.tests.filter(t => t.name === 'case s1').length,
    1,
    'the committed copy in the browser lane is ignored',
  );
  assert.equal(feed.checks.retrieval, null, 'retrieval metrics need the m2-harness step in the same lane');
});

test('golden-set metrics replace the fixture retrieval check only when this lane produced them', () => {
  const report = {
    at: '2026-11-12T00:05:00.000Z',
    official: true,
    dataset: 'retrieval-golden-v1',
    heldOut: { n: 23, recallAt1: 0.6, recallAt5: 0.9, mrr: 0.7, ndcg5: 0.75, spanHitAt5: 0.85, keywordRecallAt5: 0.6 },
    abstention: { heldOut: { noAnswerRecall: 0.67 } },
    recording: { model: 'embeddinggemma:300m', digest: 'sha256:' + 'f'.repeat(64), recordedAt: '2026-11-12' },
  };
  const golden = goldenCheck(report, '2026-11-12T00:00:00.000Z')!;
  assert.equal(golden.recallAt5, 0.9);
  assert.equal(golden.noAnswerRecall, 0.67);
  assert.equal(
    goldenCheck(report, '2026-11-12T01:00:00.000Z'),
    null,
    'a report older than the lane is a committed copy',
  );
  assert.equal(goldenCheck({ ...report, official: false }, undefined), null, 'synthetic plumbing runs never count');
  const feed = buildFeed(
    input({
      golden,
      retrieval: { lane: 'api', recallAt5: 1, mrr: 1 },
      steps: [
        { lane: 'api', step: 'm2-harness', status: 'passed', durationMs: 0, startedAt: '2026-11-12T00:00:00.000Z' },
      ],
    }),
  );
  assert.equal(feed.checks.retrieval!.source, 'recorded');
  assert.equal(feed.checks.retrieval!.recallAt5, 0.9);
});

test('names are single-line and bounded', () => {
  const feed = buildFeed(input({ nodeTests: [node('domain.test.ts', 'line\nbreak\u0007' + 'x'.repeat(400))] }));
  const name = feed.suites[0]!.tests[0]!.name;
  assert.ok(!/[\u0000-\u001f]/.test(name));
  assert.equal(name.length, 200);
});

test('history keeps the last 20 runs and replaces a re-run of the same id', () => {
  const runs = Array.from({ length: 20 }, (_, i) => ({
    id: String(i),
    number: i,
    url: null,
    commit: null,
    generatedAt: 'x',
    wallMs: 1,
    tests: 1,
    passed: 1,
    failed: 0,
    skipped: 0,
    flaky: 0,
    durationMs: 1,
  }));
  const feed = buildFeed(input({ nodeTests: [node('domain.test.ts', 'a')] }));
  const history = mergeHistory({ schema: HISTORY_SCHEMA, runs: [...runs, { ...runs[19]!, id: '1' }] }, feed);
  assert.equal(history.runs.length, 20);
  assert.equal(history.runs.at(-1)!.id, '1');
  assert.equal(history.runs.filter(r => r.id === '1').length, 1);
  assert.equal(mergeHistory({ schema: 'other', runs }, feed).runs.length, 1, 'an unknown history schema starts over');
});

test('local-model evidence is read from the committed files, not restated', () => {
  const recorded = recordedLocal(root);
  assert.deepEqual(
    recorded.map(r => r.id),
    ['m2-rag', 'm4-context', 'm5-specialists'],
  );
  const m2 = recorded[0]!;
  assert.match(m2.model!, /^qwen3:8b/);
  assert.equal(m2.hardware, 'RTX 4070 Ti SUPER');
  assert.ok(m2.facts.some(f => f.label === 'Recall@5'));
  const m5 = recorded[2]!;
  assert.equal(m5.recordedAt, null, 'the comparison file does not record a date, so none is invented');
  assert.ok(m5.facts.some(f => f.label === 'Single call' && / 8 calls/.test(f.value)));
  assert.ok(m5.facts.some(f => f.label === 'Agent as tool' && / 24 calls/.test(f.value)));
  for (const r of recorded)
    assert.match(r.evidence, /^https:\/\/github\.com\/garontherocks\/opsledger\/blob\/main\/evidence\//);
});

test('reporter records leaf results through NODE_OPTIONS and ignores nested runs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'run-feed-'));
  writeFileSync(join(dir, 'inner.test.mjs'), "import test from 'node:test';test('inner only',()=>{});\n");
  writeFileSync(
    join(dir, 'outer.test.mjs'),
    [
      "import test from 'node:test';import assert from 'node:assert';import {spawnSync} from 'node:child_process';",
      "test('group',async t=>{await t.test('passes',()=>{});await t.test('nested runner',()=>{const r=spawnSync(process.execPath,['--test',process.argv[1].replace('outer','inner')],{encoding:'utf8'});assert.equal(r.status,0);});});",
      "test('skipped',{skip:true},()=>{});",
    ].join('\n'),
  );
  const reporter = join(root, 'scripts', 'run-feed', 'node-reporter.mjs');
  const out = join(dir, 'feed');
  // Drop the parent's test-runner context so the spawned runner reports like a top-level `node --test`.
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ['--test', join(dir, 'outer.test.mjs')], {
    cwd: dir,
    encoding: 'utf8',
    env: {
      ...env,
      RUN_FEED_DIR: out,
      RUN_FEED_LANE: 'api',
      RUN_FEED_REPORTER_ACTIVE: '',
      NODE_OPTIONS: `--test-reporter=spec --test-reporter-destination=stdout --test-reporter=${reporter} --test-reporter-destination=stdout`,
    },
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /passes/, 'spec output stays on the console');
  const records = readFileSync(join(out, 'node-tests.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map(l => JSON.parse(l) as NodeRecord);
  assert.ok(!records.some(r => r.name === 'inner only'), 'a nested node --test run is not recorded twice');
  assert.deepEqual(
    leafNodeTests(records).map(r => [r.file, r.path.join('/'), r.name, r.status]),
    [
      ['outer.test.mjs', 'group', 'passes', 'passed'],
      ['outer.test.mjs', 'group', 'nested runner', 'passed'],
      ['outer.test.mjs', '', 'skipped', 'skipped'],
    ],
  );
});

test('record-step passes the exit code through and records the outcome', () => {
  const dir = mkdtempSync(join(tmpdir(), 'run-feed-step-'));
  const script = join(root, 'scripts', 'run-feed', 'record-step.mjs');
  const env = { ...process.env, RUN_FEED_DIR: dir, RUN_FEED_LANE: 'api' };
  assert.equal(
    spawnSync(process.execPath, [script, 'audit-gate', '--', process.execPath, '-e', 'process.exit(0)'], { env })
      .status,
    0,
  );
  assert.equal(
    spawnSync(process.execPath, [script, 'n8n-smoke', '--', process.execPath, '-e', 'process.exit(3)'], { env }).status,
    3,
  );
  assert.equal(spawnSync(process.execPath, [script, 'Bad Id', '--', 'true'], { env }).status, 2);
  const steps = readFileSync(join(dir, 'steps.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map(l => JSON.parse(l));
  assert.deepEqual(
    steps.map(s => [s.lane, s.step, s.status]),
    [
      ['api', 'audit-gate', 'passed'],
      ['api', 'n8n-smoke', 'failed'],
    ],
  );
  assert.ok(!existsSync(join(dir, 'node-tests.jsonl')));
});

test('coverage comes from the c8 json summary of the API lane and ends up in the feed checks', () => {
  const summary = {
    total: {
      lines: { pct: 81.2 },
      statements: { pct: 81.2 },
      functions: { pct: 77 },
      branches: { pct: 70.5 },
    },
    '/w/apps/api/src/app.ts': { lines: { pct: 90 } },
    '/w/packages/contracts/src/rag.ts': { lines: { pct: 100 } },
  };
  const coverage = coverageCheck(summary)!;
  assert.deepEqual(
    { files: coverage.files, lines: coverage.lines, branches: coverage.branches },
    { files: 2, lines: 81.2, branches: 70.5 },
  );
  assert.equal(coverageCheck(null), null);
  assert.equal(
    coverageCheck({ total: { ...summary.total, lines: { pct: 'n/a' } } }),
    null,
    'malformed totals are dropped',
  );
  assert.equal(coverageCheck({ total: { ...summary.total, branches: { pct: 120 } } }), null);
  assert.deepEqual(buildFeed(input({ coverage })).checks.coverage, coverage);
  assert.equal(buildFeed(input({})).checks.coverage, null);
});
