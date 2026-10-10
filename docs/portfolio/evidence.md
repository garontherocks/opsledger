# Curated evidence index

[Entry point](../../README.md) · [Claim mapping](claims.md)

These are selected entry points, not a dump of every generated file. Historical files keep their original SHA, environment, status and caveats. A checked-in report is not proof that today's head passed CI.

| Question | Strongest artifact | Interpretation |
|---|---|---|
| Is there a deterministic product? | [v1 report](../phase5-report.md), [browser summary](../../evidence/phase5-browser-summary.json), [accessibility](../../evidence/phase5-accessibility.json) | Historical controlled product validation; not production SLA or WCAG certification |
| Was native concurrency tested? | [deadlock failure](../../evidence/m3-lifecycle-before-fix.json), [remediation receipt](../../evidence/m3-lifecycle-remediation-ci-receipt.json), [engineering explanation](../m3-lifecycle-remediation.md) | Specific native failure and lock fix; embedded tests are not substituted for it |
| What did local AI/RAG show? | [actual M2 desktop](../../evidence/m2-human-desktop-validation.json), [M2 review](../m2-human-review-samples.md) | Small known corpus/live observation, mechanical retrieval and human judgments kept distinct |
| Did a live agent succeed? | [M3 checkpoint](../../evidence/m3-human-desktop-checkpoint.json), [M3 acceptance](../m3-acceptance-check.md) | 9/9 bounded turn-budget failures, zero drafts; safe but poor/inconclusive selection |
| Are MCP primitives real? | [protocol transcript](../../evidence/phase12-protocol-transcript.json), [HTTP security matrix](../../evidence/phase13-http-security-matrix.json), [phase 13 report](../phase13-report.md) | Mechanical protocol/identity/denial evidence; Skills are separate instructions |
| Did QA retrieval improve reasoning? | [M4 human checkpoint](../../evidence/m4-human-checkpoint.json), [ADR 009](../adr/009-qa-context-adoption.md) | Mechanical provenance worked; semantic benefit insufficient; reject default adoption |
| Is approval bounded? | [M4 acceptance](../m4-acceptance-check.md), [expiry TOCTOU regression](../../evidence/phase16-expiry-toctou-regression.json) | Limited report-storage approval; failed checks dominate; no release effect |
| Does actual n8n orchestration work? | [native runtime receipt](../../evidence/phase17-ci-receipt.json), [workflow export](../../lab/n8n/qa-report.json), [registry remediation](../phase17-registry-remediation.md) | Actual n8n runtime/bridge; fixture QA inputs are not live semantics |
| Did specialists justify adoption? | [actual comparison](../../evidence/m5-specialist-comparison-desktop.json), [human judgments](../../evidence/m5-human-checkpoint.json), [ADR 0018](../adr/0018-specialist-comparison.md) | 3× calls, no demonstrated semantic advantage; reject default adoption |
| Did the complete QA path run? | [phase 19 report](../phase19-report.md), [registered smoke source](../../scripts/phase19-smoke.ts), [accepted M5 CI](https://github.com/garontherocks/opsledger/actions/runs/38014060972) | Actual deterministic execution; synthetic changes and fixture triage/review |

## Accepted integration context

Accepted M5 checkpoint head: `2bcc7d6dac7a57451298cff4add89c212fae4aec`; [run 38014060972](https://github.com/garontherocks/opsledger/actions/runs/38014060972) passed API, browser and Windows. [PR #7](https://github.com/garontherocks/opsledger/pull/7) merged as `5d0198847e228b525073f54dd06b880cac08f20c`, the M6 starting point. This old green does not waive final-head M6 CI.

CI artifacts use finite retention (OpsLedger workflow: seven days). When a downloadable artifact expires, inspect the checked-in receipt/source and run logs; do not claim the binary artifact is permanently downloadable or regenerate historical results under the old label.
