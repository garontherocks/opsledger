# OpsLedger — evidence-driven quality engineering

An incident and runbook application, built as a deterministic TypeScript product first and then used to investigate **bounded AI-assisted QA**. The portfolio demonstrates how to test a product, constrain an agent, measure a proposed improvement and reject complexity when the evidence does not justify it.

Built by [Víctor Martín Aller](https://victoraller.vercel.app/), Senior SDET / Quality Engineer. Playwright and deterministic checks remain the foundation; AI produces bounded assistance and review artifacts, never release authority.

## Start here

| Reviewer goal | Read |
|---|---|
| Understand the system in five minutes | [Architecture and authority diagrams](docs/portfolio/architecture.md) |
| Inspect the strongest evidence | [Curated evidence index](docs/portfolio/evidence.md) |
| Verify a public statement | [Claims-to-evidence matrix](docs/portfolio/claims.md) |
| Understand negative results | [Limitations and rejected complexity](docs/portfolio/limitations.md) |
| Reproduce selected checks | [Reproduction guide](docs/portfolio/reproduction.md) |
| Discuss engineering decisions | [Interview defense](docs/portfolio/interview.md) |
| Review publication safety | [Publication review](docs/portfolio/publication.md) |
| Review M6 | [Phase 20 report and human checkpoint](docs/phase20-report.md) |

## The product

OpsLedger supports workspace-scoped incidents, lifecycle transitions, runbooks/knowledge, attachments, notifications and maintenance controls. React + Vite presents the product; Fastify + TypeScript enforces contracts, session identity, workspace authorization and business rules. PostgreSQL provides persistence, optimistic concurrency and the transactional outbox; a separate pg-boss worker processes registered jobs. Playwright, API/domain tests, accessibility checks and native database regressions validate known behavior.

The local AI product adds opt-in summaries, structured responses, semantic retrieval and cited answers. These capabilities are separate from the experimental QA retrieval and specialist comparisons. They are not a hosted inference service or a claim of generalized model accuracy.

## What the experiments actually found

- **M3 live agent:** 9/9 bounded turn-budget stops, zero drafts. The controller stopped safely; live tool-selection quality was poor/inconclusive.
- **M4 QA retrieval:** provenance and integrity worked mechanically, but correct retrieval did not reliably improve semantic reasoning. Default retrieval adoption remains **false**.
- **M5 specialists:** the live Qwen comparison showed no demonstrated semantic advantage and used **3× provider calls** versus direct mode. Default specialist adoption remains **false**.
- **Engineering failures mattered:** Windows startup, a native lifecycle/outbox deadlock, approval expiry across the check-to-effect window and Docker Hub rate limiting have linked failure/remediation records. They are evidence of specific fixes, not universal reliability guarantees.

No generalized semantic percentage, statistically significant superiority, production-value claim or autonomous release claim follows from these small, bounded experiments. [See the exact observations and contexts](docs/portfolio/claims.md).

## Product and QA are different paths

The product API owns incident state. The QA control plane owns SHA-bound evidence, registered suites, durable workflow state and a narrowly scoped human approval. MCP exposes bounded tools/resources/prompts; Skills supply instructions and are not an MCP core primitive. n8n orchestrates a signed bridge but has no QA/policy authority. Required deterministic checks dominate any AI verdict.

Human approval is action/receipt/SHA/identity/expiry-bound, one-time consumable, and authorizes only storing one local report. No model or specialist gains arbitrary shell/code execution, incident mutation, automatic approval, merge or release authority. Community n8n is not an OS sandbox; application egress controls are not process isolation; transport is not claimed exactly-once.

## Milestone progression

| Milestone | Result and evidence status |
|---|---|
| M1 · phases 0–5 | Deterministic product and QA foundation; [historical v1 report](docs/phase5-report.md) |
| M2 · phases 6–10 | Local AI/RAG mechanics and bounded evals; [accepted human checkpoint](docs/m2-human-checkpoint.md) |
| M3 · phases 11–13 | Direct tools, registry, MCP and Skills; [acceptance and limitations](docs/m3-acceptance-check.md) |
| M4 · phases 14–16 | Context, durable state, registered execution and HITL; [limited acceptance](docs/m4-acceptance-check.md) |
| M5 · phases 17–19 | n8n orchestration, specialist rejection and bounded end-to-end QA; [accepted checkpoint](evidence/m5-human-checkpoint.json) |
| M6 · phase 20 | Coordinated repository evidence package and existing web portfolio; final human truthfulness/publication checkpoint accepted; publication sequence authorized |

M1–M5 are accepted and merged. This M6 work starts from `5d0198847e228b525073f54dd06b880cac08f20c`; historical receipts retain their original SHAs and contexts. [Original chronological README](README-history.md) and [approved roadmap](docs/roadmap.md) preserve the full development record. Historical authorization annotations are not current instructions.

## Reproduce without a GPU

```bash
npm ci --ignore-scripts
npm run lint
npm run typecheck
npm run build
npm run test:unit
npm run test:integration
```

Use Node 24.19.x. Local integration defaults to an isolated PGlite test database; that is not the native PostgreSQL concurrency lane. Browser/native/n8n and Windows requirements, safe local setup and optional model prerequisites are separated in the [reproduction guide](docs/portfolio/reproduction.md). CI receipts let a reviewer inspect accepted results without rerunning expensive experiments. CI artifacts have retention limits; checked-in historical records remain the durable references.

**Public presentation is read-only documentation and sanitized examples.** No OpsLedger administration, local model endpoint, n8n administration or QA execution endpoint is exposed for the portfolio.
