# Interview defense: decisions, evidence and trade-offs

[Architecture](architecture.md) · [Claims](claims.md)

## A short explanation

“I built OpsLedger as a deterministic incident/runbook product with TypeScript, PostgreSQL, API and Playwright gates. I then used it as a controlled QA lab: local AI/RAG, a direct bounded agent, MCP, durable state and human approval, followed by n8n orchestration and specialist comparisons. I kept policy in TypeScript, measured the proposed additions and rejected default retrieval and specialist adoption when semantic evidence did not justify them. The result is inspectable engineering evidence, including failures—not autonomous release authority.”

## Decisions worth defending

| Decision | Why | Evidence / trade-off |
|---|---|---|
| Product before AI | Establish known contracts and trustworthy regression evidence | [ADR 001](../adr/001-modular-monolith.md), [phase 5](../phase5-report.md); modest modular-monolith scope |
| Direct loop/registry before MCP/frameworks | Make identity, schemas and executor policy visible | [M3 report](../m3-engineering-report.md); interoperability does not make the model intelligent |
| Durable state before orchestration | Restarts/races/expiry need durable, independently checked receipts | [ADR 010](../adr/010-qa-durable-state.md); state complexity accepted for named failure scenarios |
| n8n orchestrates, TypeScript decides | A workflow graph must not become a second policy source | [phase 17](../phase17-report.md); no OS sandbox claim |
| Reject default QA retrieval | Correct context did not reliably improve human-reviewed reasoning | [ADR 009](../adr/009-qa-context-adoption.md); retain experiment and provenance mechanics |
| Reject default specialists | Same bounded inputs/authority, 3× calls, no demonstrated semantic advantage | [ADR 0018](../adr/0018-specialist-comparison.md); direct baseline retained |
| No public agent runtime | Recruiters need evidence access, not privileged execution | [publication review](publication.md); fewer exposed endpoints, local inference remains local |

## Controlled failures to discuss

1. Native lifecycle/outbox deadlock: preserve the failure, explain the lock interaction, show the focused `FOR NO KEY UPDATE` remediation and identical overlapping regression. Do not equate PGlite green with PostgreSQL locking proof.
2. Approval expiry across TOCTOU: a model or previously valid approval cannot make an expired receipt actionable. The final effect rechecks bindings and one-time consumption.
3. Docker Hub 429: authenticated pulls repair registry delivery, not test semantics. Secrets use password-stdin/private ephemeral config. Version tags are preserved but remain mutable.
4. M3/M4/M5 negative semantic outcomes: mechanical safety and model usefulness are separate acceptance dimensions; rejection is an engineering result.

## Senior/Staff scenarios

**A manager asks for a “green AI verdict” despite a failed required suite.** Explain that the verdict cannot override deterministic failure. Show the receipt-bound checks and resulting failure/inconclusive record, rather than approving a release.

**A graph-runtime specialist proposes an extra tool or asks n8n to approve.** Explain bounded inherited identity, registered tool contracts, untrusted peer output and the TypeScript authority boundary. Neither the graph nor a specialist can expand parent permissions or consume an approval for another action/SHA.

Use actual scope and observed findings in discussion. Do not claim production adoption, generalized semantic accuracy, statistically significant improvement or runtime isolation that was not demonstrated.
