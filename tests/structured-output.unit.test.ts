import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseStructured, summaryText, unsafeText, validateSummary } from '../apps/api/src/structured-output.ts';
import { SUMMARY_JSON_SCHEMA, RISK_JSON_SCHEMA } from '../packages/contracts/src/assistance.ts';
import { evaluateCase, type EvalCase } from '../apps/api/src/assistance-eval.ts';
const dataset = JSON.parse(await readFile('tests/fixtures/phase7-eval-v1.json', 'utf8')) as { cases: EvalCase[] };
for (const item of dataset.cases)
  test('contract boundary / ' + item.split + ' / ' + item.id, () => {
    const result = evaluateCase(item);
    assert.equal(result.boundary, item.expectedBoundary);
    if (item.id.includes('semantic-falsehood') || item.id.includes('false-closure')) {
      assert.ok(result.validated);
      assert.equal(result.literalOracle?.passes, false);
      assert.equal(result.truthGuarantee, false);
    }
  });
test('provider schemas close root and nested object keys', () => {
  assert.equal(SUMMARY_JSON_SCHEMA.additionalProperties, false);
  assert.equal(RISK_JSON_SCHEMA.additionalProperties, false);
  assert.ok(JSON.stringify(SUMMARY_JSON_SCHEMA).includes('eventId'));
});

test('JSON unicode escaping cannot bypass decoded unsafe-content rejection', () => {
  const raw =
    '{"status":"draft","state":"reported","summary":"\\u003cscript\\u003ealert(1)\\u003c/script\\u003e","timeline":[],"unknowns":[]}';
  assert.throws(
    () => validateSummary(raw, { state: 'reported', eventIds: [] }),
    (error: unknown) => (error as { code: string }).code === 'model_unsafe',
  );
});

// Added after mutation testing (docs/mutation-testing.md): direct boundaries of the structured-output oracle.
test('parseStructured rejects truncation, oversize, control characters, markup and active URLs at any depth', () => {
  const code = (fn: () => unknown) => {
    try {
      fn();
      return 'accepted';
    } catch (error) {
      return (error as { code: string }).code;
    }
  };
  assert.equal(
    code(() => parseStructured('{}', true)),
    'model_truncated',
  );
  const at = (n: number) => JSON.stringify({ a: 'x'.repeat(n - 8) });
  assert.equal(at(8000).length, 8000);
  assert.equal(
    code(() => parseStructured(at(8000), false)),
    'accepted',
  );
  assert.equal(
    code(() => parseStructured(at(8001), false)),
    'model_output_budget',
  );
  assert.equal(
    code(() => parseStructured('{"a":', false)),
    'model_invalid_json',
  );
  for (const unsafe of [
    '\u0007',
    '\u000b',
    '\u001f',
    '\u007f',
    '<b>',
    '</script>',
    'JavaScript :x',
    'data:x',
    'vbscript:x',
  ])
    assert.equal(
      code(() => parseStructured(JSON.stringify({ a: [{ b: unsafe }] }), false)),
      'model_unsafe',
      unsafe,
    );
  for (const unsafe of ['\\u0007', '\\u003cb\\u003e'])
    assert.equal(
      code(() => parseStructured(`{"a":["${unsafe}"]}`, false)),
      'model_unsafe',
      unsafe,
    );
  for (const safe of ['tab\there', 'line\nbreak', 'a < b and c > d', 'see data sheet', 'x: y'])
    assert.equal(unsafeText(safe), false, safe);
  assert.deepEqual(parseStructured('{"a":[1,{"b":null}],"c":"ok"}', false), { a: [1, { b: null }], c: 'ok' });
});
test('summaryText joins the draft and enforces its size budget', () => {
  const content = {
    status: 'draft',
    summary: 'S',
    timeline: [{ eventId: 'e1', observation: 'O' }],
    unknowns: ['U'],
  } as unknown as Parameters<typeof summaryText>[0];
  assert.equal(summaryText(content), 'S\nO [e1]\nUnknown: U');
  assert.throws(() => summaryText({ ...content, summary: 'x'.repeat(8000) }), /too large/);
});
