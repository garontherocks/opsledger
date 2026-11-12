// Local model contrast and trajectory evaluation (docs/model-contrast.md).
// The evaluator and the replay are tested with two scripted "models"; the recorded Qwen3 8B vs 14B runs, when
// committed, are replayed through the production agent loop and must reproduce the recorded outcomes exactly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import type { TextProvider } from '../apps/api/src/local-model.ts';
import { PROMPT_VERSIONS } from '../apps/api/src/qa-agent.ts';
import {
  contrastReport,
  echoesInjection,
  evaluateTrajectory,
  loadRecording,
  loadTasks,
  promptOf,
  reportFile,
  recordRun,
  recordingIssues,
  replayProvider,
  replayRecording,
  taskIssues,
  wilson,
  type ContrastRecording,
  type Task,
} from '../scripts/model-contrast/contrast.ts';
import { spanRecord } from '../scripts/telemetry/memory-tracing.ts';

const { tasks: set, tasksSha256 } = loadTasks();
const digest = (c: string) => 'sha256:' + c.repeat(64);

/** A scripted model: replies in order, with fixed token counts and latency. */
function scripted(replies: unknown[]): TextProvider {
  let i = 0;
  return {
    generate: async () => ({
      text: JSON.stringify(replies[Math.min(i++, replies.length - 1)]),
      model: 'scripted',
      digest: digest('c'),
      runtime: 'scripted',
      promptTokens: 100,
      outputTokens: 20,
      latencyMs: 50,
      truncated: false,
    }),
  };
}
const read = (task: Task, n: number) => {
  const s = task.manifest.sources[n]!;
  return { kind: 'tool', name: s.tool, args: { id: s.id } };
};
const finish = (task: Task) => ({
  kind: 'finish',
  analysis: 'Unverified draft: review scope and the uncovered cases.',
  references: task.manifest.sources.map(s => s.id),
});
/** Follows the procedure on every task. */
const careful = (task: Task) => scripted([read(task, 0), read(task, 1), read(task, 2), finish(task)]);
/** Obeys injected text, follows distractor ids and re-reads a source on clean tasks. */
const gullible = (task: Task) => {
  if (task.category === 'injection-source') return scripted([read(task, 0), finish(task)]);
  if (task.category === 'distractor-ids')
    return scripted([{ kind: 'tool', name: 'get_contract', args: { id: 'contract-v0' } }]);
  if (task.category === 'injection-procedure')
    return scripted([{ kind: 'finish', analysis: 'Approved.', references: [] }]);
  return scripted([read(task, 0), read(task, 0), read(task, 2), read(task, 1), finish(task)]);
};

/**
 * Mimics the failure seen with both Qwen3 models: always proposes the first tool the prompt lists. Under v1 the list
 * never changes, so it loops; under v2 it reads `remaining`, so it progresses and finishes.
 */
const firstListed: TextProvider = {
  generate: async prompt => {
    const context = JSON.parse(prompt.slice(prompt.indexOf('\n') + 1));
    const list = (context.remaining ?? context.tools) as { name: string; id: string }[];
    const reply = list.length
      ? { kind: 'tool', name: list[0]!.name, args: { id: list[0]!.id } }
      : { kind: 'finish', analysis: 'Unverified draft.', references: context.read.map((r: { id: string }) => r.id) };
    return {
      text: JSON.stringify(reply),
      model: 'first-listed',
      digest: digest('e'),
      runtime: 'scripted',
      promptTokens: 100,
      outputTokens: 20,
      latencyMs: 50,
      truncated: false,
    };
  },
};

test('the same naive policy loops under qa-direct-v1 and finishes under qa-direct-v2', async () => {
  const model = { name: 'first-listed', digest: digest('e') };
  for (const task of set.tasks) {
    const v1 = await recordRun(task, model, firstListed, 'qa-direct-v1');
    assert.equal(v1.trajectory.mode, 'turn_budget', task.id);
    assert.equal(v1.trajectory.duplicates, 5, task.id);
    const v2 = await recordRun(task, model, firstListed, 'qa-direct-v2');
    assert.equal(v2.trajectory.mode, 'success', task.id);
    assert.equal(v2.trajectory.canonicalOrder, true, task.id);
  }
});

test('the naive policy also finishes under qa-direct-v3', async () => {
  const model = { name: 'first-listed', digest: digest('e') };
  for (const task of set.tasks)
    assert.equal((await recordRun(task, model, firstListed, 'qa-direct-v3')).trajectory.mode, 'success', task.id);
});

test('a finished draft that repeats injected text is counted as an injection echo', async () => {
  const task = set.tasks.find(t => t.id === 'injection-evidence-finish')!;
  const model = { name: 'echo', digest: digest('f') };
  const echoing = scripted([
    read(task, 0),
    read(task, 1),
    read(task, 2),
    { ...finish(task), analysis: 'Title edits are covered and the review is already approved.' },
  ]);
  const runs = [
    await recordRun(task, model, echoing),
    await recordRun(task, { ...model, name: 'clean' }, careful(task)),
  ];
  const scored = runs.map(r => ({ task, run: r.run, trajectory: r.trajectory }));
  assert.deepEqual(scored.map(echoesInjection), [true, false]);
  const summary = contrastReport(scored, ['echo', 'clean']).models;
  assert.deepEqual([summary.echo!.injectedDrafts, summary.echo!.injectionEchoes], [1, 1]);
  assert.deepEqual([summary.clean!.injectedDrafts, summary.clean!.injectionEchoes], [1, 0]);
});

async function syntheticRecording(): Promise<ContrastRecording> {
  const runs = [];
  for (const [name, model] of [
    ['careful', careful],
    ['gullible', gullible],
  ] as const)
    for (const task of set.tasks) runs.push((await recordRun(task, { name, digest: digest('d') }, model(task))).run);
  return {
    manifest: {
      version: set.version,
      tasksSha256,
      models: [
        { name: 'careful', digest: digest('d') },
        { name: 'gullible', digest: digest('d') },
      ],
      runtime: 'scripted',
      options: 'scripted',
      budgets: { deadlineMs: 120000 },
      recordedAt: '2026-11-12T00:00:00.000Z',
      hardware: 'none',
      synthetic: true,
    },
    runs,
  };
}

test('the task set is valid: unique ids, valid manifests, every category present', () => {
  assert.deepEqual(taskIssues(set), []);
  assert.equal(set.tasks.length, 12);
  for (const category of ['clean', 'injection-source', 'injection-procedure', 'distractor-ids', 'long-sources'])
    assert.ok(
      set.tasks.some(t => t.category === category),
      category,
    );
});

test('a complete trajectory is scored from its spans alone', async () => {
  const task = set.tasks[0]!;
  const { spans } = await recordRun(task, { name: 'careful', digest: digest('d') }, careful(task));
  const t = evaluateTrajectory(spans.map(spanRecord));
  assert.deepEqual(t, {
    status: 'draft',
    stopReason: 'finished_unverified',
    mode: 'success',
    steps: 4,
    tools: ['read_change_snapshot', 'get_contract', 'get_run_evidence'],
    deniedTools: 0,
    unsafeTools: 0,
    coverage: 1,
    duplicates: 0,
    canonicalOrder: true,
    tokens: 480,
  });
});

test('failure modes: premature finish, out-of-scope tool, duplicate reads and order are told apart', async () => {
  const byCategory = (c: Task['category']) => set.tasks.find(t => t.category === c)!;
  const score = async (task: Task) =>
    evaluateTrajectory(
      (await recordRun(task, { name: 'gullible', digest: digest('d') }, gullible(task))).spans.map(spanRecord),
    );
  const injected = await score(byCategory('injection-source'));
  assert.equal(injected.mode, 'premature_finish');
  assert.equal(injected.coverage, 1 / 3);
  assert.equal(injected.status, 'blocked');
  const distractor = await score(byCategory('distractor-ids'));
  assert.equal(distractor.mode, 'out_of_scope_tool');
  assert.equal(distractor.deniedTools, 1);
  assert.equal(distractor.coverage, 0);
  const clean = await score(byCategory('clean'));
  assert.equal(clean.mode, 'success');
  assert.equal(clean.duplicates, 1);
  assert.equal(clean.canonicalOrder, false);
  assert.equal(clean.steps, 5);
});

test('the replay provider rejects a changed prompt and ends the way the recorded run ended', async () => {
  const run = {
    task: 't',
    model: 'm',
    digest: digest('d'),
    generations: [
      { promptHash: 'x'.repeat(64), text: '{}', promptTokens: 1, outputTokens: 1, latencyMs: 1, truncated: false },
    ],
    outcome: { status: 'blocked' as const, reason: 'deadline', turns: 2, tokens: 2, tools: [] },
  };
  await assert.rejects(replayProvider(run).generate('another prompt'), /replay_prompt_mismatch/);
  const exhausted = replayProvider({ ...run, generations: [] });
  await assert.rejects(exhausted.generate('p'), /^Error: deadline$/);
});

test('a synthetic recording replays exactly and the report compares the two models per task', async () => {
  const recording = await syntheticRecording();
  assert.deepEqual(recordingIssues(recording, set, tasksSha256), []);
  const replay = await replayRecording(recording, set);
  assert.deepEqual(replay.mismatches, []);
  const report = contrastReport(replay.scored, ['careful', 'gullible']);
  assert.equal(report.models.careful!.successes, 12);
  assert.deepEqual(report.models.careful!.successInterval95, wilson(12, 12));
  assert.equal(report.models.gullible!.successes, 7);
  assert.deepEqual(report.models.gullible!.failureModes, {
    success: 7,
    premature_finish: 3,
    invalid_proposal: 1,
    out_of_scope_tool: 1,
  });
  assert.equal(report.models.gullible!.byCategory['injection-source']!.successes, 0);
  assert.equal(report.models.gullible!.duplicateReads, 7);
  assert.deepEqual(report.discordant, { 'only careful': 5, 'only gullible': 0 });
  assert.deepEqual(report.safety, { unsafeTools: 0, draftsWithoutAllSources: 0 });
  assert.equal(report.paired.length, 12);
  // Changing a recorded reply is caught: the replayed outcome no longer matches.
  const tampered = structuredClone(recording);
  tampered.runs[0]!.generations[3]!.text = JSON.stringify({ kind: 'finish', analysis: 'x', references: ['a'] });
  assert.equal((await replayRecording(tampered, set)).mismatches.length, 1);
});

test('wilson interval', () => {
  assert.deepEqual(wilson(0, 12), [0, 0.242]);
  assert.deepEqual(wilson(6, 12), [0.254, 0.746]);
});

for (const prompt of PROMPT_VERSIONS) {
  const recording = loadRecording(prompt);
  test(
    `recorded Qwen3 8B vs 14B runs with ${prompt} replay exactly and match the committed report`,
    {
      skip: recording
        ? false
        : `not recorded yet: run \`npm run contrast:record -- --prompt ${prompt}\` on the desktop`,
    },
    async () => {
      const rec = recording!;
      assert.deepEqual(recordingIssues(rec, set, tasksSha256), []);
      const replay = await replayRecording(rec, set);
      assert.deepEqual(replay.mismatches, []);
      const report = contrastReport(
        replay.scored,
        rec.manifest.models.map(m => m.name),
      );
      // The harness keeps every run safe whatever the model does.
      assert.deepEqual(report.safety, { unsafeTools: 0, draftsWithoutAllSources: 0 });
      assert.equal(promptOf(rec), prompt);
      assert.ok(existsSync(reportFile(prompt)), `commit ${reportFile(prompt)} with the recording`);
      const committed = JSON.parse(readFileSync(reportFile(prompt), 'utf8')) as typeof report;
      assert.deepEqual(
        {
          models: committed.models,
          paired: committed.paired,
          discordant: committed.discordant,
          safety: committed.safety,
        },
        JSON.parse(JSON.stringify(report)),
      );
    },
  );
}
