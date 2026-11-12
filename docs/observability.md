# Observability: OpenTelemetry GenAI traces

OpsLedger emits OpenTelemetry spans that follow the GenAI semantic conventions for every agent run, model call,
embedding request, retrieval and MCP tool call. The decision and its limits are in
[ADR 0020](adr/0020-genai-tracing.md).

## What a run looks like

```text
invoke_agent opsledger-qa                 status=draft stop_reason=finished_unverified turns=4 tokens=160
├─ text_completion qwen3:8b               turn=1 input_tokens=… output_tokens=… finish_reasons=[stop]
├─ execute_tool read_change_snapshot
├─ text_completion qwen3:8b               turn=2
├─ execute_tool get_contract
├─ text_completion qwen3:8b               turn=3
├─ execute_tool get_run_evidence
└─ text_completion qwen3:8b               turn=4   → event mandatory_gate(required_sources_read, passed)

retrieval opsledger-knowledge             top_k=5 hits=5
└─ embeddings embeddinggemma:300m         purpose=query inputs=1
```

A denied tool call is an `execute_tool` span with `error.type=tool_scope` plus a `denial` event on the agent span; a
failed model call is a `text_completion` span with error status while the agent stops cleanly as `provider_error`.

## Privacy

Spans hold identities, counts, token usage, durations and outcomes. They never hold prompts, model output, tool
arguments, queries or document text; a test plants a canary in all of them and checks the export.

## Using the traces

The app only depends on `@opentelemetry/api`, so nothing is recorded unless a provider is registered. Tests and local
recordings use [`scripts/telemetry/memory-tracing.ts`](../scripts/telemetry/memory-tracing.ts):

```ts
import { memoryTracing, toJsonl } from '../scripts/telemetry/memory-tracing.ts';
const tracing = memoryTracing();
await runAgent(manifest, provider);
writeFileSync('.local/run.jsonl', toJsonl(tracing.spans())); // one flat record per span, with parent links
```

## Tests

- `tests/agent-tracing.unit.test.ts` — trajectory, tool allowlist, denials, provider errors, MCP spans, no content.
- `tests/retrieval-golden.integration.test.ts` — retrieval and embeddings spans on the real index and search path.
