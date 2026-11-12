# Run feed: the CI run, replayed by skill

Every push to `main` publishes the results of its CI run to GitHub Pages:

| Path | Content |
| --- | --- |
| `https://garontherocks.github.io/opsledger/run/latest.json` | Latest run of `main`, one entry per test |
| `https://garontherocks.github.io/opsledger/run/history.json` | Totals of the last 20 runs |

The **Quality run** page of [victoraller.vercel.app](https://victoraller.vercel.app/quality-run?suite=opsledger)
reads the feed and replays the run test by test. The feed follows the public contract
[`sdet-portfolio/run-feed@1`](https://github.com/garontherocks/sdet-portfolio/blob/main/docs/run-feed.md);
OpsLedger adds only optional fields, which consumers that don't know them ignore.

## Suites are skills

Results are grouped by the skill they demonstrate, not by test type. The mapping lives in
[`scripts/run-feed/catalog.ts`](../scripts/run-feed/catalog.ts): every node:test file, every wrapped CI step and
every Playwright flow belongs to exactly one skill, and `tests/run-feed.unit.test.ts` fails when one is left out.
Anything unmapped still appears, under "Other checks", instead of disappearing.

| Skill | Provenance | Evidence in CI |
| --- | --- | --- |
| Product contracts & data integrity | deterministic | Domain and integration tests on PostgreSQL 18.6, quality baseline |
| Product UI end to end | deterministic | Playwright flows on Chromium, lifecycle regression on five fresh server lifetimes |
| Structured output contracts | fixture | Strict JSON contracts, refusals, assistance API and UI |
| RAG, embeddings & citations | fixture | Fixed vectors, citation spans, source versions, M2 harness retrieval metrics |
| Retrieval quality (golden set) | recorded | Real embeddings of the pinned model replayed through production search: Recall@k, MRR, nDCG, citable span, abstention ([details](retrieval-golden.md)) |
| Prompt-injection & eval regression | fixture | Promptfoo boundary cases with egress denied, one entry per case |
| Agent budgets & tool boundaries | fixture | Turn/deadline/token budgets, M3 tool boundaries, agent eval cases |
| MCP read-only server | deterministic | `opsledger-qa-readonly` over stdio and HTTP, on Linux and Windows |
| Context engineering & provenance | fixture | Budgeted, SHA-bound context; M4 harness |
| Human approval gates & durable workflow | deterministic | One-time, SHA-bound approvals, crash and restart recovery, approval UI |
| Signed orchestration with n8n | deterministic | HMAC webhooks, duplicate recovery, actual n8n Community smoke |
| Specialist comparison & QA pipeline | fixture | Specialist contracts, paired comparison on fixtures, registered-suite pipeline |
| Supply chain & build integrity | deterministic | Lint, typecheck, build, audit gate (ADR 0019), feed builder tests |

**Provenance** is part of every suite in the feed (`provenance`, `note`):

- `deterministic` — no model is involved.
- `fixture` — an AI contract is exercised with synthetic or hand-written model output. CI has no GPU and never calls a
  live model, so a green fixture suite proves the contract, schema, boundary or plumbing — not model quality.
- `recorded` — real output of the pinned local model, recorded on the desktop and replayed exactly in CI. The retrieval
  golden set uses it to measure embedding quality without a GPU in CI.

## Live local-model runs are separate

`recordedLocal` lists live runs with Qwen3 8B on Ollama that were recorded on the author's desktop and committed as
evidence (M2, M4, M5). Their facts are read from the evidence files when the feed is built, and the consumer shows
them apart from the CI run. They are never counted in the run totals.

## How results are collected

- **node:test** — CI sets `NODE_OPTIONS` to add [`node-reporter.mjs`](../scripts/run-feed/node-reporter.mjs) next
  to the `spec` reporter, so console output is unchanged. It records file, test path, status and duration to
  `$RUN_FEED_DIR/node-tests.jsonl`. Registered suites that start their own `node --test` are not recorded twice.
- **Harness steps** — [`record-step.mjs`](../scripts/run-feed/record-step.mjs) wraps a command, passes its output and
  exit code through and records the step outcome. Agent-eval and Promptfoo reports also expand into one entry per case.
- **Browser flows** — the Playwright JSON reports in `.local/browser-*.json`.

Each lane uploads a `run-feed-<lane>` artifact. The `build-run-feed` job builds the feed with
[`build-run-feed.ts`](../scripts/run-feed/build-run-feed.ts) on every run, pull requests included, and writes a
per-skill summary to the job summary. On pushes to `main` it first appends the run to the published history, and
`publish-run-feed` deploys it to Pages — also when tests fail, so the published run is the real one.

Only test names, statuses and durations are published: no assertion messages, logs, prompts or model output.

Reproduce locally:

```bash
export RUN_FEED_DIR=.local/run-feed/local RUN_FEED_LANE=api
NODE_OPTIONS="--test-reporter=spec --test-reporter-destination=stdout --test-reporter=./scripts/run-feed/node-reporter.mjs --test-reporter-destination=stdout" npm run test:unit
node --experimental-strip-types scripts/run-feed/build-run-feed.ts --input .local/run-feed --out .local/pages
```
