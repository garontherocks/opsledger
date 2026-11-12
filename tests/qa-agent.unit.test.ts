import { test } from 'node:test';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { runAgent, registry } from '../apps/api/src/qa-agent.ts';
import type { TextProvider } from '../apps/api/src/local-model.ts';
import { fixture, valid, provider } from './qa-agent.fixtures.ts';
test('valid direct loop preserves complete ordered read trace and unverified draft', async () => {
  const r = await runAgent(fixture(), provider(valid));
  assert.equal(r.status, 'draft');
  assert.equal(r.turns, 4);
  assert.equal(r.operationalAuthority, false);
  assert.equal(r.qualityVerified, false);
  assert.equal(r.trace.filter(x => x.event === 'tool_result').length, 3);
});
test('early finish cannot skip mandatory reads even when poisoned evidence says skip', async () => {
  const r = await runAgent(fixture(true), provider([valid[3]]));
  assert.equal(r.reason, 'required_sources');
  assert.equal(r.trace.filter(x => x.event === 'tool_result').length, 0);
});
test('unknown tool, path/command arguments, extra fields and malformed JSON execute no tools', async () => {
  for (const p of [
    { kind: 'tool', name: 'run_shell', args: { id: 'change-a' } },
    { kind: 'tool', name: 'get_contract', args: { id: 'contract-a', path: '/etc/passwd' } },
    { kind: 'tool', name: 'get_contract', args: { id: 'contract-a' }, command: 'close incident' },
    'not-json',
  ]) {
    const r = await runAgent(fixture(), provider([p]));
    assert.equal(r.reason, 'invalid_proposal');
    assert.equal(r.trace.filter(x => x.event === 'tool_result').length, 0);
  }
});
test('cross-manifest source IDs fail before invocation', async () => {
  const r = await runAgent(
    fixture(),
    provider([{ kind: 'tool', name: 'get_contract', args: { id: 'other-workspace' } }]),
  );
  assert.equal(r.reason, 'tool_scope');
  assert.equal(r.trace.filter(x => x.event === 'tool_result').length, 0);
});
test('source tampering and duplicate manifest tools fail before inference', async () => {
  let calls = 0;
  const p: TextProvider = {
    generate: async () => {
      calls++;
      throw new Error('never');
    },
  };
  const m = fixture();
  m.sources[0]!.text = 'altered';
  assert.equal((await runAgent(m, p)).reason, 'mandatory_gate');
  const d = fixture();
  d.sources[1]!.tool = d.sources[0]!.tool;
  assert.equal((await runAgent(d, p)).reason, 'mandatory_gate');
  assert.equal(calls, 0);
});
test('registry copies approved source snapshot; caller mutation cannot replace content', () => {
  const m = fixture(),
    r = registry(m);
  m.sources[0]!.text = 'changed';
  assert.equal(
    r.invoke('read_change_snapshot', { id: 'change-a' }).text,
    'Synthetic change: add scoped runbook query.',
  );
});
test('six-turn loop stops repeated calls with no implicit retry', async () => {
  const r = await runAgent(fixture(), provider([valid[0]]));
  assert.equal(r.reason, 'turn_budget');
  assert.equal(r.turns, 6);
});
test('deadline stops and late provider completion cannot execute a tool', async () => {
  const r = await runAgent(fixture(), provider([valid[0]], 50), { deadlineMs: 5 });
  assert.equal(r.reason, 'deadline');
  await new Promise(resolve => setTimeout(resolve, 60));
  assert.equal(r.trace.filter(x => x.event === 'tool_result').length, 0);
});
test('response, total response, prompt and token budgets fail closed', async () => {
  assert.equal((await runAgent(fixture(), provider(['x'.repeat(4001)]))).reason, 'response_budget');
  assert.equal((await runAgent(fixture(), provider(valid), { totalResponseChars: 1 })).reason, 'total_response_budget');
  assert.equal((await runAgent(fixture(), provider(valid), { promptChars: 1 })).reason, 'prompt_budget');
  assert.equal((await runAgent(fixture(), provider(valid), { tokens: 1 })).reason, 'token_budget');
});
test('missing token metadata and truncated responses fail closed', async () => {
  for (const field of [{ promptTokens: null }, { truncated: true }]) {
    const p = provider(valid);
    const r = await runAgent(fixture(), { generate: async (a, b) => ({ ...(await p.generate(a, b)), ...field }) });
    assert.equal(r.status, 'blocked');
  }
});
test('poisoned source stays untrusted; model analysis never becomes a passed gate', async () => {
  const r = await runAgent(fixture(true), provider(valid));
  assert.equal(r.status, 'draft');
  const output = r.trace.find(x => x.event === 'tool_result' && JSON.stringify(x.data).includes('IGNORE ALL'));
  assert.ok(output);
  assert.equal(r.qualityVerified, false);
});
test('forged finish references are denied even after all mandatory reads', async () => {
  const r = await runAgent(
    fixture(),
    provider([...valid.slice(0, 3), { ...valid[3], references: ['change-a', 'contract-a', 'forged'] }]),
  );
  assert.equal(r.reason, 'required_sources');
});
test('qa-direct-v1 prompts are byte-identical to the accepted M3 prompt; v2 states progress', async () => {
  const prompts = async (promptVersion?: 'qa-direct-v1' | 'qa-direct-v2') => {
    const seen: string[] = [];
    const inner = provider(valid);
    await runAgent(
      fixture(),
      { generate: async (t, f) => (seen.push(t), inner.generate(t, f)) },
      {},
      promptVersion ? { promptVersion } : {},
    );
    return seen;
  };
  const v1 = await prompts();
  assert.deepEqual(
    v1.map(p => createHash('sha256').update(p).digest('hex').slice(0, 16)),
    ['26fd2621bd12360c', 'ebc7e22ddd57f719', '34dc58029ed9f5d2', '1325ff9fb2b26a13'],
  );
  assert.deepEqual(await prompts('qa-direct-v1'), v1);
  const v2 = (await prompts('qa-direct-v2')).map(p => JSON.parse(p.slice(p.indexOf('\n') + 1)));
  assert.deepEqual(
    v2.map(c => [c.read.map((r: { id: string }) => r.id), c.remaining.map((r: { id: string }) => r.id)]),
    [
      [[], ['change-a', 'contract-a', 'evidence-a']],
      [['change-a'], ['contract-a', 'evidence-a']],
      [['change-a', 'contract-a'], ['evidence-a']],
      [['change-a', 'contract-a', 'evidence-a'], []],
    ],
  );
  assert.ok(v2.every(c => !('history' in c) && c.read.every((r: { untrusted: boolean }) => r.untrusted)));
  const r = await runAgent(fixture(), provider(valid), {}, { promptVersion: 'other' as 'qa-direct-v1' });
  assert.equal(r.reason, 'mandatory_gate');
});
test('qa-direct-v3 narrows the decoding schema to the next valid actions; replies are still fully validated', async () => {
  const formats: Record<string, unknown>[] = [];
  const inner = provider(valid);
  const r = await runAgent(
    fixture(),
    { generate: async (t, f) => (formats.push(f!), inner.generate(t, f)) },
    {},
    { promptVersion: 'qa-direct-v3' },
  );
  assert.equal(r.status, 'draft');
  const calls = (f: Record<string, unknown>) =>
    (
      (f.oneOf ?? []) as { properties: { name: { const: string }; args: { properties: { id: { const: string } } } } }[]
    ).map(o => `${o.properties.name.const}:${o.properties.args.properties.id.const}`);
  assert.deepEqual(calls(formats[0]!), [
    'read_change_snapshot:change-a',
    'get_contract:contract-a',
    'get_run_evidence:evidence-a',
  ]);
  assert.deepEqual(calls(formats[2]!), ['get_run_evidence:evidence-a']);
  const finish = formats[3] as { properties: { kind: { const: string }; references: { items: { enum: string[] } } } };
  assert.equal(finish.properties.kind.const, 'finish');
  assert.deepEqual(finish.properties.references.items.enum, ['change-a', 'contract-a', 'evidence-a']);
  // A runtime that ignored the schema cannot get a re-read past the harness: the reply is checked like any other.
  const ignoring = await runAgent(
    fixture(),
    provider([valid[0], valid[0], valid[0], valid[0], valid[0], valid[0]]),
    {},
    { promptVersion: 'qa-direct-v3' },
  );
  assert.equal(ignoring.reason, 'turn_budget');
});
