// Runs one CI step and records its outcome for the public run feed (docs/run-feed.md).
//   node scripts/run-feed/record-step.mjs <step-id> -- <command> [args...]
// Output is inherited unchanged and the exit code is passed through. When $RUN_FEED_DIR is set,
// one JSON line {lane, step, status, durationMs, startedAt} is appended to $RUN_FEED_DIR/steps.jsonl.
import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const separator = args.indexOf('--');
const step = args[0];
const command = separator >= 0 ? args.slice(separator + 1) : [];
if (!step || separator !== 1 || !command.length || !/^[a-z0-9][a-z0-9-]*$/.test(step)) {
  console.error('usage: record-step.mjs <step-id> -- <command> [args...]');
  process.exit(2);
}

const started = Date.now();
const child = spawn(command[0], command.slice(1), { stdio: 'inherit', shell: false });
const finish = code => {
  if (process.env.RUN_FEED_DIR) {
    mkdirSync(process.env.RUN_FEED_DIR, { recursive: true });
    const record = {
      lane: process.env.RUN_FEED_LANE || 'local',
      step,
      status: code === 0 ? 'passed' : 'failed',
      durationMs: Date.now() - started,
      startedAt: new Date(started).toISOString(),
    };
    appendFileSync(join(process.env.RUN_FEED_DIR, 'steps.jsonl'), JSON.stringify(record) + '\n');
  }
  process.exit(code);
};
child.once('error', error => {
  console.error(error.message);
  finish(1);
});
child.once('exit', code => finish(code ?? 1));
