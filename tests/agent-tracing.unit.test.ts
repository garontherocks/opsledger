// Trace-based tests (ADR 0020): the agent's trajectory is asserted on the OpenTelemetry spans it emits,
// the same way an observability backend would see it. Spans must describe the run without carrying its content.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SpanStatusCode } from '@opentelemetry/api';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import type { ReadableSpan } from '@opentelemetry/sdk-trace';
import { memoryTracing, spanRecord, toJsonl } from '../scripts/telemetry/memory-tracing.ts';
import { runAgent, hash, TOOL_NAMES, type Manifest } from '../apps/api/src/qa-agent.ts';
import { qaMcpServer } from '../apps/api/src/qa-mcp.ts';
import { ATTR, GENAI_CONVENTIONS, traceGeneration } from '../apps/api/src/telemetry.ts';
import type { TextProvider } from '../apps/api/src/local-model.ts';
import { fixture, provider, valid } from './qa-agent.fixtures.ts';

const op = (s: ReadableSpan) => s.attributes[ATTR.operation];
const byOp = (spans: ReadableSpan[], name: string) => spans.filter(s => op(s) === name);
const parentOf = (s: ReadableSpan) => s.parentSpanContext?.spanId;
const idOf = (s: ReadableSpan) => s.spanContext().spanId;
const eventNames = (s: ReadableSpan) => s.events.map(e => e.name);

test('a complete run is one invoke_agent span whose children replay the trajectory in order', async () => {
  const tracing = memoryTracing();
  const r = await runAgent(fixture(), provider(valid));
  const spans = tracing.spans();
  const [root] = byOp(spans, 'invoke_agent');
  assert.ok(root);
  assert.equal(byOp(spans, 'invoke_agent').length, 1);
  assert.equal(parentOf(root), undefined);
  assert.equal(root.name, 'invoke_agent opsledger-qa');
  assert.equal(root.attributes[ATTR.agentName], 'opsledger-qa');
  assert.equal(root.attributes[ATTR.conventions], GENAI_CONVENTIONS);
  assert.equal(root.attributes['opsledger.agent.status'], r.status);
  assert.equal(root.attributes['opsledger.agent.stop_reason'], 'finished_unverified');
  // Every model call and tool call is a direct child of the agent span.
  const children = spans.filter(s => s !== root);
  assert.ok(children.every(s => parentOf(s) === idOf(root) && s.spanContext().traceId === root.spanContext().traceId));
  // The trajectory, read from the spans alone: model, tool, model, tool, model, tool, model(finish).
  assert.deepEqual(
    children.map(s => (op(s) === 'execute_tool' ? s.attributes[ATTR.toolName] : op(s))),
    [
      'text_completion',
      'read_change_snapshot',
      'text_completion',
      'get_contract',
      'text_completion',
      'get_run_evidence',
      'text_completion',
    ],
  );
  const calls = byOp(spans, 'text_completion');
  assert.equal(calls.length, r.turns);
  assert.deepEqual(
    calls.map(s => s.attributes['opsledger.agent.turn']),
    [1, 2, 3, 4],
  );
  for (const s of calls) {
    assert.equal(s.name, 'text_completion fixture');
    assert.equal(s.attributes[ATTR.provider], 'ollama');
    assert.equal(s.attributes[ATTR.responseModel], 'fixture');
    assert.deepEqual(s.attributes[ATTR.finishReasons], ['stop']);
  }
  // Token usage on the model spans adds up to the budget the harness enforced.
  const used = calls.reduce(
    (sum, s) => sum + Number(s.attributes[ATTR.inputTokens]) + Number(s.attributes[ATTR.outputTokens]),
    0,
  );
  assert.equal(used, r.tokens);
  assert.equal(root.attributes['opsledger.agent.tokens'], r.tokens);
  // Harness gates are span events, so a backend can tell a verified stop from a model-declared one.
  assert.deepEqual(
    eventNames(root).filter(n => n.endsWith('mandatory_gate')),
    ['opsledger.agent.mandatory_gate', 'opsledger.agent.mandatory_gate'],
  );
  assert.ok(root.events.every(e => e.attributes?.['opsledger.passed'] !== false));
  assert.equal(root.status.code, SpanStatusCode.UNSET);
});

test('only allowlisted tools ever appear as execute_tool spans', async () => {
  const tracing = memoryTracing();
  for (const p of [
    { kind: 'tool', name: 'run_shell', args: { id: 'change-a' } },
    { kind: 'tool', name: 'get_contract', args: { id: 'contract-a', path: '/etc/passwd' } },
    'not-json',
  ])
    await runAgent(fixture(), provider([p]));
  const spans = tracing.spans();
  assert.equal(byOp(spans, 'invoke_agent').length, 3);
  assert.equal(byOp(spans, 'execute_tool').length, 0);
  for (const root of byOp(spans, 'invoke_agent')) {
    assert.equal(root.attributes['opsledger.agent.stop_reason'], 'invalid_proposal');
    assert.ok(eventNames(root).includes('opsledger.agent.denial'));
  }
  await runAgent(fixture(), provider(valid));
  const tools = byOp(tracing.spans(), 'execute_tool').map(s => s.attributes[ATTR.toolName]);
  assert.ok(tools.length > 0 && tools.every(t => (TOOL_NAMES as readonly unknown[]).includes(t)));
});

test('an out-of-scope tool call is a failed execute_tool span and a denial on the agent span', async () => {
  const tracing = memoryTracing();
  const r = await runAgent(fixture(), provider([{ kind: 'tool', name: 'get_contract', args: { id: 'other-ws' } }]));
  assert.equal(r.reason, 'tool_scope');
  const spans = tracing.spans();
  const [tool] = byOp(spans, 'execute_tool');
  assert.ok(tool);
  assert.equal(tool.attributes[ATTR.errorType], 'tool_scope');
  const [root] = byOp(spans, 'invoke_agent');
  const denial = root!.events.find(e => e.name === 'opsledger.agent.denial');
  assert.equal(denial?.attributes?.['opsledger.reason'], 'tool_scope');
  assert.equal(root!.attributes['opsledger.agent.status'], 'blocked');
});

test('a provider failure marks the model span as an error while the agent stops cleanly', async () => {
  const tracing = memoryTracing();
  const failing: TextProvider = {
    generate: async () => {
      throw new TypeError('connection refused');
    },
  };
  const r = await runAgent(fixture(), failing);
  assert.equal(r.reason, 'provider_error');
  const [call] = byOp(tracing.spans(), 'text_completion');
  assert.equal(call!.status.code, SpanStatusCode.ERROR);
  assert.equal(call!.attributes[ATTR.errorType], 'TypeError');
  const [root] = byOp(tracing.spans(), 'invoke_agent');
  assert.equal(root!.status.code, SpanStatusCode.UNSET);
  assert.equal(root!.attributes['opsledger.agent.stop_reason'], 'provider_error');
});

test('spans never carry prompts, model output, tool arguments or source text', async () => {
  const tracing = memoryTracing();
  const canary = 'CANARY-5f1e9c-do-not-export';
  const manifest = fixture();
  manifest.sources = manifest.sources.map(s => ({ ...s, text: `${s.text} ${canary}`, sha256: '' }));
  manifest.sources = manifest.sources.map(s => ({ ...s, sha256: hash(s.text) }));
  const finish = { ...valid[3], analysis: `Draft analysis ${canary}` };
  const r = await runAgent(
    manifest as Manifest,
    provider([...valid.slice(0, 3), finish]),
    {},
    {
      procedure: `Procedure ${canary}`,
    },
  );
  assert.equal(r.status, 'draft');
  // The internal trace keeps the content for the reviewer; the exported spans must not.
  assert.ok(JSON.stringify(r.trace).includes(canary));
  const exported = toJsonl(tracing.spans());
  assert.ok(!exported.includes(canary));
  assert.ok(!exported.includes('QA read-only analysis'));
  assert.ok(!exported.includes('"id":"contract-a"'));
  assert.ok(!exported.includes('Draft analysis'));
});

test('feature model calls are text_completion spans labelled by feature', async () => {
  const tracing = memoryTracing();
  const truncated: TextProvider = {
    generate: async () => ({
      text: '{"a":',
      model: 'qwen3:8b',
      digest: 'sha256:' + 'b'.repeat(64),
      runtime: 'ollama 0.40.3',
      promptTokens: 30,
      outputTokens: null,
      latencyMs: 1,
      truncated: true,
    }),
  };
  await traceGeneration(truncated, 'prompt text', undefined, { 'opsledger.feature': 'rag' });
  const [span] = tracing.spans();
  assert.equal(span!.name, 'text_completion qwen3:8b');
  assert.equal(span!.attributes['opsledger.feature'], 'rag');
  assert.deepEqual(span!.attributes[ATTR.finishReasons], ['length']);
  assert.equal(span!.attributes[ATTR.inputTokens], 30);
  assert.equal(span!.attributes[ATTR.outputTokens], undefined);
  assert.equal(span!.attributes[ATTR.modelRuntime], 'ollama 0.40.3');
});

test('MCP tool calls are execute_tool spans tagged with the read-only server', async () => {
  const tracing = memoryTracing();
  const manifest = fixture();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = qaMcpServer(manifest);
  const client = new Client({ name: 'trace-test', version: '1.0.0' });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const ok = await client.callTool({ name: 'get_contract', arguments: { id: 'contract-a' } });
    assert.notEqual(ok.isError, true);
    const denied = await client.callTool({ name: 'get_contract', arguments: { id: 'other-ws' } });
    assert.equal(denied.isError, true);
  } finally {
    await client.close();
    await server.close();
  }
  const tools = byOp(tracing.spans(), 'execute_tool');
  assert.equal(tools.length, 2);
  for (const s of tools) {
    assert.equal(s.name, 'execute_tool get_contract');
    assert.equal(s.attributes['opsledger.mcp.server'], 'opsledger-qa-readonly');
  }
  assert.equal(tools[0]!.attributes[ATTR.errorType], undefined);
  assert.equal(tools[1]!.attributes[ATTR.errorType], 'tool_scope');
  assert.ok(!toJsonl(tools).includes('Require authorization'));
});

test('span records are flat JSON with parent links, ready for JSONL export', async () => {
  const tracing = memoryTracing();
  await runAgent(fixture(), provider(valid));
  const records = tracing.spans().map(spanRecord);
  const root = records.find(r => r.parentSpanId === null)!;
  assert.equal(root.name, 'invoke_agent opsledger-qa');
  assert.ok(records.filter(r => r !== root).every(r => r.parentSpanId === root.spanId));
  assert.deepEqual(JSON.parse(JSON.stringify(records)), records);
});
