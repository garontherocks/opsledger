// Rebuilds a contrast report from its committed recording (no model involved), keeping the recording metadata.
//   npm run contrast:report -- --prompt qa-direct-v2
// Use it when the evaluator gains a metric; the replay test then checks the report against the recording again.
import { readFileSync, writeFileSync } from 'node:fs';
import { PROMPT_VERSIONS, type PromptVersion } from '../../apps/api/src/qa-agent.ts';
import { contrastReport, loadRecording, loadTasks, replayRecording, reportFile } from './contrast.ts';

const flag = process.argv.indexOf('--prompt');
const prompts = (flag >= 0 ? [process.argv[flag + 1]] : PROMPT_VERSIONS) as PromptVersion[];
const { tasks } = loadTasks();
for (const prompt of prompts) {
  const recording = loadRecording(prompt);
  if (!recording) {
    console.log(`${prompt}: not recorded, skipped`);
    continue;
  }
  const replay = await replayRecording(recording, tasks);
  if (replay.mismatches.length) throw new Error(`${prompt} does not replay:\n` + replay.mismatches.join('\n'));
  const previous = JSON.parse(readFileSync(reportFile(prompt), 'utf8')) as { at: string };
  const report = contrastReport(
    replay.scored,
    recording.manifest.models.map(m => m.name),
  );
  writeFileSync(
    reportFile(prompt),
    JSON.stringify({ at: previous.at, recording: recording.manifest, ...report }, null, 2) + '\n',
  );
  console.log(`${prompt}: ${reportFile(prompt)} rebuilt`);
}
