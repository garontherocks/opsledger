// Records the local model contrast on the desktop (see docs/model-contrast.md).
//   npm run contrast:record
// Runs every task of tests/fixtures/model-contrast-v1/tasks.json through the production agent loop once with the
// pinned Qwen3 8B from .env and once with CONTRAST_MODEL (default qwen3:14b-q4_K_M), both through the production
// Ollama provider (temperature 0, seed 42, thinking off). Writes:
//   tests/fixtures/model-contrast-v1/recording.json  model replies + prompt hashes, replayed in CI (commit it)
//   evidence/model-contrast.json                      trajectory evaluation report (commit it)
//   .local/model-contrast/traces/<model>/<task>.jsonl OpenTelemetry spans of each live run (not committed)
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { config } from '../../apps/api/src/config.ts';
import { OllamaProvider, type TextProvider } from '../../apps/api/src/local-model.ts';
import { toJsonl } from '../telemetry/memory-tracing.ts';
import {
  CONTRAST_BUDGETS,
  CONTRAST_DIR,
  contrastReport,
  loadTasks,
  recordRun,
  recordingIssues,
  replayRecording,
  taskIssues,
  type ContrastRecording,
  type RecordedRun,
} from './contrast.ts';

const settings = config({ ...process.env, AI_ENABLED: 'true' });
if (settings.NODE_ENV === 'production' || settings.LAB_MODE !== 'true')
  throw new Error('Owned nonproduction AI lab only');
const expected = process.env.OLLAMA_EXPECTED_VERSION;
if (!expected) throw new Error('Set OLLAMA_EXPECTED_VERSION to the exact Ollama runtime you are recording with');
const get = async (path: string) => {
  const response = await fetch(new URL(path, settings.OLLAMA_URL), {
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Ollama is not reachable on the configured loopback URL');
  return response.json() as Promise<unknown>;
};
const runtime = ((await get('/api/version')) as { version: string }).version;
if (runtime !== expected) throw new Error(`Ollama ${runtime} is running but OLLAMA_EXPECTED_VERSION is ${expected}`);
const installed = ((await get('/api/tags')) as { models: { name: string; digest: string }[] }).models.map(m => ({
  name: m.name,
  digest: m.digest.startsWith('sha256:') ? m.digest : 'sha256:' + m.digest,
}));
const pinned = installed.find(m => m.name === settings.OLLAMA_MODEL);
if (!pinned || pinned.digest !== settings.OLLAMA_DIGEST)
  throw new Error(`${settings.OLLAMA_MODEL} is not installed with the OLLAMA_DIGEST pinned in .env`);
const contrastName = process.env.CONTRAST_MODEL ?? 'qwen3:14b-q4_K_M';
const contrast = installed.find(m => m.name === contrastName);
if (!contrast) throw new Error(`${contrastName} is not installed: run \`ollama pull ${contrastName}\` first`);
if (process.env.CONTRAST_DIGEST && process.env.CONTRAST_DIGEST !== contrast.digest)
  throw new Error(`${contrastName} digest ${contrast.digest} differs from CONTRAST_DIGEST`);
const models = [pinned, contrast];

const { tasks: set, tasksSha256 } = loadTasks();
const issues = taskIssues(set);
if (issues.length) throw new Error('Fix the task set before recording:\n' + issues.join('\n'));

let hardware = 'unknown';
try {
  hardware = execFileSync('nvidia-smi', ['--query-gpu=name', '--format=csv,noheader'], {
    encoding: 'utf8',
    timeout: 3000,
    maxBuffer: 4096,
  })
    .trim()
    .split('\n')[0]!
    .trim();
} catch {
  hardware = 'no NVIDIA GPU reported';
}

const runs: RecordedRun[] = [];
const started = Date.now();
for (const model of models) {
  const ollama = new OllamaProvider({
    ...settings,
    // Lab-only: the product's model allowlist stays at the 8B; the contrast model is pinned by digest here instead.
    OLLAMA_MODEL: model.name as typeof settings.OLLAMA_MODEL,
    OLLAMA_DIGEST: model.digest,
    AI_TIMEOUT_MS: CONTRAST_BUDGETS.deadlineMs,
  });
  const provider: TextProvider = {
    async generate(prompt, format) {
      const result = await ollama.generate(prompt, format);
      if (result.runtime !== expected) throw new Error('Runtime changed during the recording');
      return result;
    },
  };
  for (const [i, task] of set.tasks.entries()) {
    const { run, spans, trajectory } = await recordRun(task, model, provider);
    const dir = `.local/model-contrast/traces/${model.name.replace(/[^a-z0-9.-]/gi, '_')}`;
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}/${task.id}.jsonl`, toJsonl(spans));
    runs.push(run);
    const minutes = ((Date.now() - started) / 60000).toFixed(1);
    console.log(
      `[${minutes} min] ${model.name} ${i + 1}/${set.tasks.length} ${task.id}: ${run.outcome.reason} (${run.outcome.turns} turns, ${trajectory.tools.length} tool calls)`,
    );
  }
}

const recording: ContrastRecording = {
  manifest: {
    version: set.version,
    tasksSha256,
    models,
    runtime: `Ollama ${runtime}`,
    options: 'temperature 0, seed 42, think false, num_ctx 4096, keep_alive 0 (production provider)',
    budgets: CONTRAST_BUDGETS,
    recordedAt: new Date().toISOString(),
    hardware,
  },
  runs,
};
const problems = recordingIssues(recording, set, tasksSha256);
if (problems.length) throw new Error('The recording is incomplete:\n' + problems.join('\n'));

// Check right away that CI will be able to replay it exactly.
const replay = await replayRecording(recording, set);
if (replay.mismatches.length)
  throw new Error('The recording does not replay exactly:\n' + replay.mismatches.join('\n'));
writeFileSync(`${CONTRAST_DIR}/recording.json`, JSON.stringify(recording, null, 1) + '\n');
const report = contrastReport(
  replay.scored,
  models.map(m => m.name),
);
mkdirSync('evidence', { recursive: true });
writeFileSync(
  'evidence/model-contrast.json',
  JSON.stringify({ at: recording.manifest.recordedAt, recording: recording.manifest, ...report }, null, 2) + '\n',
);
for (const [name, summary] of Object.entries(report.models))
  console.log(
    `${name}: ${summary.successes}/${summary.runs} finished with all sources read, modes ${JSON.stringify(summary.failureModes)}, median call ${summary.medianCallLatencyMs} ms`,
  );
console.log(`Safety: ${JSON.stringify(report.safety)}`);
console.log('Next: run `npm run contrast:test`, then commit recording.json and evidence/model-contrast.json.');
