// Builds the public run feed (`sdet-portfolio/run-feed@1`, see docs/run-feed.md) from the CI lane artifacts.
//   node --experimental-strip-types scripts/run-feed/build-run-feed.ts --input <dir> --out <dir> [--history <file>]
// <dir> holds one folder per lane artifact with node-tests.jsonl, steps.jsonl, lane-*.json,
// browser-*.json (Playwright JSON) and the eval reports the harnesses write.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { LANES, RECORDED_LOCAL, SKILLS, STEP_COMMANDS, type Provenance, type Skill } from './catalog.ts';

export const FEED_SCHEMA = 'sdet-portfolio/run-feed@1';
export const HISTORY_SCHEMA = 'sdet-portfolio/run-history@1';
const HISTORY_LIMIT = 20;
const REPOSITORY_URL = 'https://github.com/garontherocks/opsledger';

export type Status = 'passed' | 'failed' | 'skipped';
export type NodeRecord = {
  lane: string;
  file: string;
  path: string[];
  name: string;
  kind: string;
  status: Status;
  durationMs: number;
};
export type StepRecord = { lane: string; step: string; status: Status; durationMs: number; startedAt: string };
export type FeedTest = {
  name: string;
  group: string;
  target: string;
  status: Status;
  durationMs: number;
  retries: number;
};
type Totals = { tests: number; passed: number; failed: number; skipped: number; flaky: number; durationMs: number };
type Collected = { skill: string; flaky: boolean; test: FeedTest };

const clean = (text: string) =>
  String(text)
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
const laneName = (lane: string) => LANES[lane] ?? lane;

/** Keeps leaf tests only: describe blocks and tests that own subtests are containers, not results. */
export function leafNodeTests(records: NodeRecord[]): NodeRecord[] {
  const key = (lane: string, file: string, path: string[]) => JSON.stringify([lane, file, path]);
  const parents = new Set(
    records
      .map(r => (r.path.length ? key(r.lane, r.file, r.path) : null))
      .filter((value): value is string => value !== null),
  );
  return records.filter(r => r.kind !== 'suite' && !parents.has(key(r.lane, r.file, [...r.path, r.name])));
}

/** Playwright JSON report → one entry per test (last attempt), with retries and flakiness. */
export function playwrightTests(report: unknown, lane: string): { flow: string; test: FeedTest; flaky: boolean }[] {
  const out: { flow: string; test: FeedTest; flaky: boolean }[] = [];
  const walk = (suite: { title?: string; file?: string; specs?: unknown[]; suites?: unknown[] }, titles: string[]) => {
    const here = suite.title && !suite.title.endsWith('.ts') ? [...titles, suite.title] : titles;
    for (const raw of suite.specs ?? []) {
      const spec = raw as {
        title: string;
        file: string;
        tests: { projectName?: string; results: { status: string; duration: number }[] }[];
      };
      for (const t of spec.tests) {
        const results = t.results ?? [];
        const last = results[results.length - 1];
        if (!last) continue;
        const status: Status = last.status === 'passed' ? 'passed' : last.status === 'skipped' ? 'skipped' : 'failed';
        const flow = basename(spec.file).replace(/\.spec\.ts$/, '');
        out.push({
          flow,
          flaky: status === 'passed' && results.length > 1,
          test: {
            name: clean(spec.title),
            group: clean(here.join(' › ') || flow),
            target: laneName(lane),
            status,
            durationMs: Math.round(last.duration ?? 0),
            retries: results.length - 1,
          },
        });
      }
    }
    for (const child of suite.suites ?? []) walk(child as typeof suite, here);
  };
  for (const suite of (report as { suites?: unknown[] })?.suites ?? []) walk(suite as { title?: string }, []);
  return out;
}

/** Eval reports written by the harnesses → one entry per case. */
export function evalCases(step: string, report: unknown, lane: string): FeedTest[] {
  const target = laneName(lane);
  if (step === 'agent-eval') {
    const results = (report as { results?: { id: string; split?: string; expectedMatched: boolean }[] })?.results ?? [];
    return results.map(r => ({
      name: clean(`case ${r.id}`),
      group: clean(`Agent eval${r.split ? ' · ' + r.split : ''}`),
      target,
      status: r.expectedMatched ? 'passed' : 'failed',
      durationMs: 0,
      retries: 0,
    }));
  }
  if (step === 'ai-regression') {
    const outputs =
      (report as { outputs?: { caseId: string; split?: string; surface?: string; boundaryExpectationMet: boolean }[] })
        ?.outputs ?? [];
    return outputs.map(o => ({
      name: clean(`case ${o.caseId}`),
      group: clean(`Promptfoo${o.surface ? ' · ' + o.surface : ''}`),
      target,
      status: o.boundaryExpectationMet ? 'passed' : 'failed',
      durationMs: 0,
      retries: 0,
    }));
  }
  return [];
}

const fileSkill = new Map(SKILLS.flatMap(s => s.files.map(f => [f, s.id] as const)));
const stepSkill = new Map(SKILLS.flatMap(s => s.steps.map(step => [step, s.id] as const)));
const flowSkill = new Map(SKILLS.flatMap(s => s.flows.map(flow => [flow, s.id] as const)));
const OTHER: Skill = {
  id: 'other',
  name: 'Other checks',
  tool: 'node:test',
  provenance: 'deterministic',
  note: 'Results not yet mapped to a skill.',
  files: [],
  steps: [],
  flows: [],
};

function totalsOf(entries: Collected[]): Totals {
  const t: Totals = { tests: 0, passed: 0, failed: 0, skipped: 0, flaky: 0, durationMs: 0 };
  for (const { test, flaky } of entries) {
    t.tests++;
    t[test.status]++;
    if (flaky) t.flaky++;
    t.durationMs += test.durationMs;
  }
  return t;
}

function suiteCommand(skill: Skill) {
  const parts: string[] = [];
  if (skill.files.length) {
    const shown = skill.files
      .slice(0, 2)
      .map(f => 'tests/' + f)
      .join(' ');
    parts.push(`node --test ${shown}${skill.files.length > 2 ? ` (+${skill.files.length - 2} files)` : ''}`);
  }
  for (const step of skill.steps.filter(s => STEP_COMMANDS[s])) parts.push(STEP_COMMANDS[step]!);
  if (skill.flows.length) parts.push(`npx playwright test ${skill.flows.map(f => f + '.spec.ts').join(' ')}`);
  return parts.slice(0, 2).join(' && ');
}

export type RunInfo = {
  id: string | null;
  number: number | null;
  attempt: number | null;
  workflow: string;
  event: string;
  branch: string;
  commit: string | null;
  repository: string;
  url: string | null;
};
export type RecordedLocal = {
  id: string;
  title: string;
  recordedAt: string | null;
  commit: string | null;
  model: string | null;
  runtime: string | null;
  hardware: string | null;
  facts: { label: string; value: string }[];
  finding: string;
  evidence: string;
};
/** Held-out metrics of the retrieval golden set (evidence/phase21-retrieval-golden.json), when the run produced them. */
export type GoldenCheck = {
  dataset: string;
  split: 'held-out';
  queries: number;
  recallAt1: number;
  recallAt5: number;
  mrr: number;
  ndcg5: number;
  spanHitAt5: number;
  keywordRecallAt5: number;
  noAnswerRecall: number;
  model: string;
  digest: string;
  recordedAt: string;
};
export type BuildInput = {
  nodeTests: NodeRecord[];
  steps: StepRecord[];
  browser: { lane: string; report: unknown }[];
  evals: { step: string; lane: string; report: unknown }[];
  lanes: { lane: string; startedAt?: string | undefined; finishedAt?: string | undefined }[];
  retrieval: { lane: string; recallAt5: number; mrr: number } | null;
  golden?: GoldenCheck | null;
  coverage?: CoverageCheck | null;
  run: RunInfo;
  generatedAt: string;
  node: string;
  recorded: RecordedLocal[];
};

export function buildFeed(input: BuildInput) {
  const collected: Collected[] = [];
  for (const r of leafNodeTests(input.nodeTests)) {
    const file = basename(r.file);
    const group = r.path.length ? r.path.join(' › ') : file.replace(/\.test\.ts$/, '');
    collected.push({
      skill: fileSkill.get(file) ?? OTHER.id,
      flaky: false,
      test: {
        name: clean(r.name),
        group: clean(group),
        target: laneName(r.lane),
        status: r.status,
        durationMs: r.durationMs,
        retries: 0,
      },
    });
  }
  for (const s of input.steps) {
    collected.push({
      skill: stepSkill.get(s.step) ?? OTHER.id,
      flaky: false,
      test: {
        name: clean(STEP_COMMANDS[s.step] ?? s.step),
        group: 'CI step',
        target: laneName(s.lane),
        status: s.status,
        durationMs: s.durationMs,
        retries: 0,
      },
    });
  }
  // An eval report counts only where its step ran: committed copies in other lanes are stale evidence, not results.
  const ran = (step: string, lane: string) => input.steps.some(s => s.step === step && s.lane === lane);
  for (const e of input.evals.filter(e => ran(e.step, e.lane)))
    for (const test of evalCases(e.step, e.report, e.lane))
      collected.push({ skill: stepSkill.get(e.step) ?? OTHER.id, flaky: false, test });
  for (const b of input.browser)
    for (const { flow, test, flaky } of playwrightTests(b.report, b.lane))
      collected.push({ skill: flowSkill.get(flow) ?? OTHER.id, flaky, test });

  const suites = [...SKILLS, OTHER]
    .map(skill => {
      const entries = collected.filter(c => c.skill === skill.id);
      if (!entries.length) return null;
      const lanes = [...new Set(entries.map(e => e.test.target))];
      const targets = lanes.map(name => ({ name, totals: totalsOf(entries.filter(e => e.test.target === name)) }));
      return {
        id: skill.id,
        name: skill.name,
        tool: skill.tool,
        provenance: skill.provenance as Provenance,
        note: skill.note,
        command: suiteCommand(skill) || undefined,
        target: lanes.join(', '),
        targets,
        areas: new Set(entries.map(e => e.test.group)).size,
        totals: totalsOf(entries),
        tests: entries.map(e => e.test),
      };
    })
    .filter(s => s !== null);

  const starts = [...input.lanes.map(l => l.startedAt), ...input.steps.map(s => s.startedAt)]
    .filter((v): v is string => Boolean(v))
    .map(v => Date.parse(v))
    .filter(Number.isFinite);
  const ends = [
    ...input.lanes
      .map(l => l.finishedAt)
      .filter((v): v is string => Boolean(v))
      .map(v => Date.parse(v)),
    ...input.steps.map(s => Date.parse(s.startedAt) + s.durationMs),
  ].filter(Number.isFinite);
  const window =
    starts.length && ends.length
      ? {
          startedAt: new Date(Math.min(...starts)).toISOString(),
          finishedAt: new Date(Math.max(...ends)).toISOString(),
          wallMs: Math.max(...ends) - Math.min(...starts),
        }
      : null;

  return {
    schema: FEED_SCHEMA,
    generatedAt: input.generatedAt,
    run: input.run,
    window,
    totals: totalsOf(collected),
    suites,
    environment: {
      database: 'PostgreSQL 18.6 + pgvector 0.8.7',
      browsers: ['Chromium'],
      runner: 'Linux X64 · Windows',
      node: input.node,
      pipeline: 'GitHub Actions',
      models: 'none in CI · AI contracts run on fixtures',
    },
    // The golden set measures real recorded embeddings; the M2 harness only checks plumbing with synthetic vectors.
    checks: {
      retrieval: input.golden
        ? { ...input.golden, source: 'recorded' }
        : input.retrieval && ran('m2-harness', input.retrieval.lane)
          ? { recallAt5: input.retrieval.recallAt5, mrr: input.retrieval.mrr, source: 'fixture' }
          : null,
      coverage: input.coverage ?? null,
    },
    reports: { history: './history.json' },
    recordedLocal: input.recorded,
  };
}

type Feed = ReturnType<typeof buildFeed>;
export type HistoryRun = {
  id: string | null;
  number: number | null;
  url: string | null;
  commit: string | null;
  generatedAt: string;
  wallMs: number | null;
  tests: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  durationMs: number;
};

/** Appends this run to the published history (newest last, at most 20); a re-run attempt replaces its run. */
export function mergeHistory(previous: unknown, feed: Feed) {
  const prior =
    (previous as { schema?: string; runs?: HistoryRun[] })?.schema === HISTORY_SCHEMA &&
    Array.isArray((previous as { runs: HistoryRun[] }).runs)
      ? (previous as { runs: HistoryRun[] }).runs
      : [];
  const t = feed.totals;
  const run: HistoryRun = {
    id: feed.run.id,
    number: feed.run.number,
    url: feed.run.url,
    commit: feed.run.commit,
    generatedAt: feed.generatedAt,
    wallMs: feed.window?.wallMs ?? null,
    tests: t.tests,
    passed: t.passed,
    failed: t.failed,
    skipped: t.skipped,
    flaky: t.flaky,
    durationMs: t.durationMs,
  };
  return { schema: HISTORY_SCHEMA, runs: [...prior.filter(r => r.id !== run.id), run].slice(-HISTORY_LIMIT) };
}

const asNumber = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const MODE_LABELS: Record<string, string> = {
  single: 'Single call',
  agent_as_tool: 'Agent as tool',
  handoff: 'Handoff',
};
const fmt = (v: unknown, digits = 0) => (asNumber(v) === null ? '—' : (v as number).toFixed(digits));

/** Facts for the committed local-model evidence, read from the files so the page never restates them by hand. */
export function recordedLocal(root: string): RecordedLocal[] {
  const out: RecordedLocal[] = [];
  for (const source of RECORDED_LOCAL) {
    const path = join(root, source.file);
    if (!existsSync(path)) continue;
    const j = JSON.parse(readFileSync(path, 'utf8'));
    const evidence = `${REPOSITORY_URL}/blob/main/${source.file}`;
    const base = { id: source.id, title: source.title, finding: source.finding, evidence };
    if (source.id === 'm2-rag') {
      const d = j.desktop ?? {},
        env = j.environment ?? {};
      out.push({
        ...base,
        recordedAt: j.recordedDate ?? null,
        commit: j.validatedHandoffCommit ?? null,
        model: [env.generationModel, env.embeddingModel].filter(Boolean).join(' + ') || null,
        runtime: env.ollama ? `Ollama ${env.ollama}` : null,
        hardware: env.gpu ?? null,
        facts: [
          { label: 'Generations', value: fmt(d.generations) },
          { label: 'Execution errors', value: fmt(d.executionErrors) },
          { label: 'Literal failures', value: fmt(d.literalFailures) },
          { label: 'Recall@5', value: fmt(d.recallAt5, 2) },
          { label: 'MRR', value: fmt(d.mrr, 2) },
          {
            label: 'Mean latency',
            value:
              asNumber(d.meanGenerationLatencySecondsApprox) === null
                ? '—'
                : `≈${d.meanGenerationLatencySecondsApprox} s`,
          },
        ],
      });
    } else if (source.id === 'm4-context') {
      const d = j.desktop ?? {};
      out.push({
        ...base,
        recordedAt: j.date ?? null,
        commit: j.implementationHandoffSha ?? null,
        model: d.model ?? null,
        runtime: d.expectedOllamaRuntime ? `Ollama ${d.expectedOllamaRuntime}` : null,
        hardware: null,
        facts: [
          { label: 'Generations', value: fmt(d.generations) },
          { label: 'Provider errors', value: fmt(d.providerErrors) },
          { label: 'Contract failures', value: fmt(d.contractFailures) },
          { label: 'Retrieval adopted by default', value: d.defaultRetrievalAdoption ? 'yes' : 'no' },
        ],
      });
    } else if (source.id === 'm5-specialists') {
      const modes = (j.aggregate ?? []) as {
        mode: string;
        pairs: number;
        exactSyntheticRiskLabelMatches: number;
        calls: number;
        wallLatencyMs: number;
      }[];
      out.push({
        ...base,
        recordedAt: null,
        commit: j.sha ?? null,
        model: null,
        runtime: j.expectedRuntime ? `Ollama ${j.expectedRuntime}` : null,
        hardware: null,
        facts: [
          ...modes.map(m => ({
            label: MODE_LABELS[m.mode] ?? m.mode.replace(/_/g, ' '),
            value: `${m.exactSyntheticRiskLabelMatches}/${m.pairs} label matches · ${m.calls} calls · ${Math.round(m.wallLatencyMs / 1000)} s`,
          })),
          { label: 'Specialists adopted by default', value: j.defaultSpecialistAdoption ? 'yes' : 'no' },
        ],
      });
    }
  }
  return out;
}

/** Only an official report written during this lane counts: a committed copy from an earlier run is not this run's result. */
export type CoverageCheck = {
  scope: string;
  files: number;
  lines: number;
  statements: number;
  functions: number;
  branches: number;
};
/**
 * Line, statement, function and branch coverage of apps/api and packages from c8's json-summary (npm run
 * coverage:report), measured over every Node process of the API lane: unit, integration, harness and golden-set runs.
 */
export function coverageCheck(summary: unknown): CoverageCheck | null {
  const s = summary as Record<string, Record<string, { pct?: unknown }>> | null;
  const total = s?.total;
  const pct = (k: string) => asNumber(total?.[k]?.pct);
  const values = ['lines', 'statements', 'functions', 'branches'].map(pct);
  if (!total || values.some(v => v === null || v! < 0 || v! > 100)) return null;
  const [lines, statements, functions, branches] = values as number[];
  return {
    scope: 'apps/api and packages, all Node processes of the API lane',
    files: Object.keys(s!).filter(k => k !== 'total').length,
    lines: lines!,
    statements: statements!,
    functions: functions!,
    branches: branches!,
  };
}

export function goldenCheck(report: unknown, laneStartedAt: string | undefined): GoldenCheck | null {
  const r = report as {
    at?: string;
    official?: boolean;
    dataset?: string;
    heldOut?: Record<string, number>;
    abstention?: { heldOut?: { noAnswerRecall?: number } };
    recording?: { model?: string; digest?: string; recordedAt?: string };
  } | null;
  if (!r?.official || !r.at || !r.heldOut || !r.recording) return null;
  if (laneStartedAt && Date.parse(r.at) < Date.parse(laneStartedAt)) return null;
  const h = r.heldOut;
  return {
    dataset: r.dataset ?? 'unknown',
    split: 'held-out',
    queries: h.n ?? 0,
    recallAt1: h.recallAt1 ?? 0,
    recallAt5: h.recallAt5 ?? 0,
    mrr: h.mrr ?? 0,
    ndcg5: h.ndcg5 ?? 0,
    spanHitAt5: h.spanHitAt5 ?? 0,
    keywordRecallAt5: h.keywordRecallAt5 ?? 0,
    noAnswerRecall: r.abstention?.heldOut?.noAnswerRecall ?? 0,
    model: r.recording.model ?? 'unknown',
    digest: r.recording.digest ?? 'unknown',
    recordedAt: r.recording.recordedAt ?? 'unknown',
  };
}

const readLines = <T>(file: string): T[] =>
  existsSync(file)
    ? readFileSync(file, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line) as T)
    : [];
const readJson = (file: string): unknown => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null);

export function collectArtifacts(input: string) {
  const dirs = readdirSync(input)
    .map(d => join(input, d))
    .filter(d => statSync(d).isDirectory());
  const nodeTests: NodeRecord[] = [],
    steps: StepRecord[] = [],
    browser: { lane: string; report: unknown }[] = [],
    evals: { step: string; lane: string; report: unknown }[] = [],
    lanes: { lane: string; startedAt?: string | undefined; finishedAt?: string | undefined }[] = [];
  let retrieval: { lane: string; recallAt5: number; mrr: number } | null = null,
    golden: GoldenCheck | null = null,
    coverage: CoverageCheck | null = null;
  for (const dir of dirs) {
    const start = readJson(join(dir, 'lane-start.json')) as { lane?: string; startedAt?: string } | null;
    const end = readJson(join(dir, 'lane-end.json')) as { finishedAt?: string } | null;
    const lane = start?.lane ?? basename(dir).replace(/^run-feed-/, '');
    lanes.push({ lane, startedAt: start?.startedAt, finishedAt: end?.finishedAt });
    nodeTests.push(...readLines<NodeRecord>(join(dir, 'node-tests.jsonl')));
    steps.push(...readLines<StepRecord>(join(dir, 'steps.jsonl')));
    for (const f of readdirSync(dir).filter(f => /^browser-[a-z]+\.json$/.test(f)))
      browser.push({ lane, report: readJson(join(dir, f)) });
    for (const [step, file] of [
      ['agent-eval', 'phase11-agent-eval.json'],
      ['ai-regression', 'phase10-eval-report.json'],
    ] as const) {
      const report = readJson(join(dir, file));
      if (report) evals.push({ step, lane, report });
    }
    const m2 = readJson(join(dir, 'm2-bundle-harness.json')) as {
      retrieval?: { recallAt5?: number; mrr?: number };
    } | null;
    golden = goldenCheck(readJson(join(dir, 'phase21-retrieval-golden.json')), start?.startedAt) ?? golden;
    coverage = coverageCheck(readJson(join(dir, 'coverage-summary.json'))) ?? coverage;
    if (
      m2?.retrieval &&
      asNumber(m2.retrieval.recallAt5) !== null &&
      asNumber(m2.retrieval.mrr) !== null &&
      steps.some(s => s.step === 'm2-harness' && s.lane === lane)
    )
      retrieval = { lane, recallAt5: m2.retrieval.recallAt5!, mrr: m2.retrieval.mrr! };
  }
  return { nodeTests, steps, browser, evals, lanes, retrieval, golden, coverage };
}

function runFromEnvironment(env: NodeJS.ProcessEnv): RunInfo {
  const server = env.GITHUB_SERVER_URL ?? 'https://github.com',
    repository = env.GITHUB_REPOSITORY ?? 'garontherocks/opsledger';
  return {
    id: env.GITHUB_RUN_ID ?? null,
    number: env.GITHUB_RUN_NUMBER ? Number(env.GITHUB_RUN_NUMBER) : null,
    attempt: env.GITHUB_RUN_ATTEMPT ? Number(env.GITHUB_RUN_ATTEMPT) : null,
    workflow: env.GITHUB_WORKFLOW ?? 'local',
    event: env.GITHUB_EVENT_NAME ?? 'local',
    branch: env.GITHUB_REF_NAME ?? 'local',
    commit: env.GITHUB_SHA ?? null,
    repository,
    url: env.GITHUB_RUN_ID ? `${server}/${repository}/actions/runs/${env.GITHUB_RUN_ID}` : null,
  };
}

function main(argv: string[]) {
  const arg = (name: string) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const input = arg('--input'),
    out = arg('--out'),
    historyFile = arg('--history');
  if (!input || !out) throw new Error('usage: build-run-feed.ts --input <dir> --out <dir> [--history <file>]');
  const artifacts = collectArtifacts(input);
  if (!artifacts.nodeTests.length && !artifacts.steps.length && !artifacts.browser.length)
    throw new Error(`No results found under ${input}`);
  const feed = buildFeed({
    ...artifacts,
    run: runFromEnvironment(process.env),
    generatedAt: new Date().toISOString(),
    node: process.version,
    recorded: recordedLocal(process.cwd()),
  });
  const history = mergeHistory(historyFile ? readJson(historyFile) : null, feed);
  mkdirSync(join(out, 'run'), { recursive: true });
  writeFileSync(join(out, 'run', 'latest.json'), JSON.stringify(feed, null, 2) + '\n');
  writeFileSync(join(out, 'run', 'history.json'), JSON.stringify(history, null, 2) + '\n');
  const t = feed.totals;
  console.log(
    `run feed: ${t.tests} tests in ${feed.suites.length} skills (${t.passed} passed, ${t.failed} failed, ${t.skipped} skipped); history ${history.runs.length} run(s)`,
  );
  for (const s of feed.suites)
    console.log(`  ${s.provenance.padEnd(13)} ${s.name}: ${s.totals.passed}/${s.totals.tests}`);
}

if (process.argv[1]?.endsWith('build-run-feed.ts')) main(process.argv.slice(2));
