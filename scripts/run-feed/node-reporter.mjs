// node:test reporter that records every test result for the public run feed (docs/run-feed.md).
// Loaded through NODE_OPTIONS in CI next to the `spec` reporter, so console output is unchanged:
//   NODE_OPTIONS="--test-reporter=spec --test-reporter-destination=stdout
//                 --test-reporter=./scripts/run-feed/node-reporter.mjs --test-reporter-destination=stdout"
// It yields nothing; results are appended as JSON lines to $RUN_FEED_DIR/node-tests.jsonl.
// Only names, statuses and durations are recorded: never assertion messages, output or source text.
import { appendFileSync, mkdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const NESTED = 'RUN_FEED_REPORTER_ACTIVE';

export default async function* runFeedReporter(source) {
  // Test files that start their own `node --test` (registered QA suites) inherit NODE_OPTIONS.
  // The outermost reporter claims the run; nested runners see the marker and record nothing.
  const enabled = Boolean(process.env.RUN_FEED_DIR) && process.env[NESTED] !== '1';
  if (enabled) process.env[NESTED] = '1';
  const target = enabled ? join(process.env.RUN_FEED_DIR, 'node-tests.jsonl') : null;
  if (target) mkdirSync(process.env.RUN_FEED_DIR, { recursive: true });
  const lane = process.env.RUN_FEED_LANE || 'local';
  const stacks = new Map();
  for await (const event of source) {
    if (!target) continue;
    const data = event.data;
    if (!data?.file) continue;
    const file = relative(process.cwd(), data.file).split(sep).join('/');
    if (event.type === 'test:start') {
      const stack = stacks.get(file) ?? [];
      stack.length = data.nesting;
      stack[data.nesting] = data.name;
      stacks.set(file, stack);
      continue;
    }
    if (event.type !== 'test:pass' && event.type !== 'test:fail') continue;
    const path = (stacks.get(file) ?? []).slice(0, data.nesting);
    const status = data.skip || data.todo ? 'skipped' : event.type === 'test:pass' ? 'passed' : 'failed';
    const record = {
      lane,
      file,
      path,
      name: data.name,
      kind: data.details?.type ?? 'test',
      status,
      durationMs: Math.round(data.details?.duration_ms ?? 0),
    };
    appendFileSync(target, JSON.stringify(record) + '\n');
  }
}
