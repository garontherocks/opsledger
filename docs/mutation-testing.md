# Mutation testing of the AI oracles

The checks that keep the AI part honest are code: the agent's gates and budgets (`apps/api/src/qa-agent.ts`), the
structured-output parser that rejects unsafe or malformed model output (`apps/api/src/structured-output.ts`) and the
trajectory evaluator (`scripts/model-contrast/contrast.ts`). Green tests do not prove those checks would notice a bug.
Mutation testing does: [Stryker](https://stryker-mutator.io/) plants small bugs (mutants) in the code, such as `>`
for `>=`, a condition forced to `true` or an emptied string, and runs the unit tests against each. A mutant the tests
do not catch is a bug the suite would let through.

```bash
npm run test:mutation                                         # ~10 minutes, report in reports/mutation/
node --experimental-strip-types scripts/mutation-summary.ts   # update evidence/mutation-testing.json
```

Stryker's command runner runs `node:test` directly on the TypeScript sources (`stryker.config.json`). CI runs it weekly
and on demand (`.github/workflows/mutation.yml`), not on every push. It fails if the total score drops below 75% or any
file drops more than one point below the committed baseline in
[`evidence/mutation-testing.json`](../evidence/mutation-testing.json).

## Results (2026-11-12)

| File | First run | After new tests |
| --- | --- | --- |
| `qa-agent.ts` | 62.7% | 76.7% |
| `structured-output.ts` | 60.4% | 77.5% |
| `contrast.ts` | 79.3% | 79.3% |
| **Total** (995 mutants) | **70.0%** | **78.0%** |

**What the first run found.** The suite passed, yet:

- Removing the tool check from the registry (`s.tool === tool` → `true`) survived: the agent could call `get_contract`
  with the change's id and receive the change's content. No test asked for one tool with another tool's valid id.
- Every budget comparison could flip from `>` to `>=` unnoticed: tests only used budgets far over or under the limit.
- A manifest with a repeated id under different tools, a finish citing the same source twice, negative or fractional
  token counts and ids matching the pattern only as a prefix or suffix were never tried.
- The parser's unsafe-content rules (control characters, markup, `javascript:`/`data:` URLs, nested values) and its
  8,000-character limit were tested only through end-to-end fixtures.

Each now has a direct test (marked in `tests/qa-agent.unit.test.ts` and `tests/structured-output.unit.test.ts`).

## Remaining survivors

About 220 mutants survive. Most are low risk: span attribute and event-detail strings, JSON-schema literals sent to the
model (the reply is validated again by the harness), and the MCP reader path, which is covered by the M3 integration
test rather than these unit tests. Some are equivalent: for example, removing `if (!source)` still fails, because the
next line throws on the missing source and the agent treats any registry error as out of scope. The report lists every
survivor; raising the score further is a choice, not a gap in the gates.
