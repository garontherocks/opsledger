# ADR 0020 — OpenTelemetry GenAI spans, API-only in the app, asserted by trace-based tests

Status: accepted 2026-11-12 (owner decision). Review when the GenAI semantic conventions leave Development.

## Context

The roadmap's observability strategy (section O) asks to follow one agent run from start to stop, see why a tool was
denied and diagnose a retrieval miss, while never exporting prompts, documents or credentials by default. The agent
already keeps an internal, ordered `trace` array for reviewers, but nothing a standard observability backend could read.
OpenTelemetry's GenAI semantic conventions define the span names and attributes for agent invocations, model calls,
embeddings, retrieval and tool calls; they are still in Development, so names can change.

## Decision

1. **The app depends only on `@opentelemetry/api`.** Without a registered SDK every span is a no-op, so production
   behaviour, latency and the zero-cost/no-egress constraint are unchanged. The SDK packages
   (`@opentelemetry/sdk-trace`, `@opentelemetry/context-async-hooks`) are dev dependencies used by tests and by local
   desktop recordings (`scripts/telemetry/memory-tracing.ts`). No exporter sends data anywhere.
2. **All GenAI names live in `apps/api/src/telemetry.ts`.** Every span records the convention version it follows
   (`opsledger.telemetry.conventions`, currently `opentelemetry-semantic-conventions@1.43.0 (gen_ai: development)`).
   The names used were checked against the installed `@opentelemetry/semantic-conventions/incubating` export.
3. **Span model.**

   | Span | `gen_ai.operation.name` | Where | Key attributes |
   | --- | --- | --- | --- |
   | `invoke_agent opsledger-qa` | `invoke_agent` | `runAgent` | agent name, status, stop reason, turns, tokens; harness events (`mandatory_gate`, `denial`, `stop`) |
   | `text_completion <model>` | `text_completion` | agent turns, RAG, summaries, specialists | provider, response model, digest, runtime, finish reason, input/output tokens, `opsledger.feature` or `opsledger.agent.turn` |
   | `execute_tool <name>` | `execute_tool` | agent tool calls, MCP server tools | tool name/type, `error.type` (`tool_scope`, `tool_transport`), `opsledger.mcp.server` |
   | `embeddings <model>` | `embeddings` | indexing, search, QA context | request model, input count, purpose (`document`/`query`) |
   | `retrieval opsledger-knowledge` | `retrieval` | exact-cosine search | data source, top_k, hit count |

4. **No content in spans.** Prompts, model output, tool arguments, source and chunk text and queries are never
   attributes or event fields. Span events copy only `reason`, `name` and `passed`. Content stays in the reviewer-only
   internal trace and the hashed evidence files.
5. **Trace-based tests.** `tests/agent-tracing.unit.test.ts` asserts the agent's trajectory on the exported spans (one
   root, ordered model/tool children, turns equal model spans, token totals equal the enforced budget), that only
   allowlisted tools appear as `execute_tool`, that denials and provider failures are visible, that MCP tool calls are
   traced, and that a canary planted in sources, procedure and model output never reaches the export. The retrieval
   golden set asserts the retrieval/embeddings span tree on the real index and search path.

## Consequences

- Trajectory evaluation can work from spans: the same JSONL records (`toJsonl`) are what desktop recordings of live
  local-model runs will produce, so CI fixtures and recorded runs share one format.
- Renamed conventions mean editing one file and the convention version string.
- Not done: metrics, log correlation, an OTLP exporter or a Langfuse profile. Those are added only when visual
  investigation would save effort (roadmap section O).
