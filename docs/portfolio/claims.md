# Public claims → evidence

[Entry point](../../README.md) · [Evidence index](evidence.md) · [Limitations](limitations.md)

Classification is explicit: directly demonstrated deterministic behavior, mechanically verified contracts, human-reviewed judgment, live-model observation, fixture/synthetic evaluation, experimental capability or rejected/deferred complexity. A single claim may need several categories.

| Recommended public claim | Classification | Concrete evidence | Limit |
|---|---|---|---|
| Built an incident/runbook product with deterministic quality gates | Directly demonstrated; synthetic test data | [phase 5 report](../phase5-report.md), [API/domain tests](../../tests/integration.test.ts), [browser tests](../../tests/browser) | Historical suite coverage, not universal correctness or production readiness |
| Tested native concurrent lifecycle/outbox behavior and fixed a demonstrated deadlock | Directly demonstrated failure/remediation | [before fix](../../evidence/m3-lifecycle-before-fix.json), [fix receipt](../../evidence/m3-lifecycle-remediation-ci-receipt.json) | Specific lock scenario, not a general availability guarantee |
| Built local GenAI/RAG with structured outputs and provenance checks | Mechanical plus live-model observed/human-reviewed | [M2 desktop](../../evidence/m2-human-desktop-validation.json), [M2 review](../m2-human-review-samples.md) | Small known corpus; no generalized accuracy or calibrated semantic percentage |
| Built a bounded direct agent, MCP tools/resources/prompts and separate Skills | Mechanically verified; live limitations observed | [protocol transcript](../../evidence/phase12-protocol-transcript.json), [M3 checkpoint](../../evidence/m3-human-desktop-checkpoint.json) | Live M3: 9/9 turn-budget stops, zero drafts; poor/inconclusive tool selection |
| Rejected default QA retrieval after semantic review | Human-reviewed; rejected default | [M4 checkpoint](../../evidence/m4-human-checkpoint.json), [ADR 009](../adr/009-qa-context-adoption.md) | Provenance worked; reasoning did not reliably improve; `defaultRetrievalAdoption=false` |
| Implemented durable QA state, registered execution and bounded HITL | Mechanically verified; limited human security acceptance | [M4 acceptance](../m4-acceptance-check.md), [TOCTOU regression](../../evidence/phase16-expiry-toctou-regression.json) | One local report effect; action/receipt/SHA/identity/expiry-bound; no merge/release |
| Used n8n as orchestration while TypeScript retained authority | Actual runtime mechanical verification; fixture QA inputs | [runtime receipt](../../evidence/phase17-ci-receipt.json), [export](../../lab/n8n/qa-report.json) | n8n is not policy authority or OS sandbox; transport not exactly-once |
| Rejected default specialists: 3× calls without demonstrated semantic advantage | Live-model observed; human-reviewed; rejected default | [comparison](../../evidence/m5-specialist-comparison-desktop.json), [checkpoint](../../evidence/m5-human-checkpoint.json), [ADR 0018](../adr/0018-specialist-comparison.md) | Qwen 3:8b Q4, eight paired cases per mode; no statistical/generalized superiority claim |
| Demonstrated a bounded change-risk → suites → execution → triage → eval → review path | Actual registered deterministic execution; synthetic change; fixture triage/review | [phase 19 report](../phase19-report.md), [smoke source](../../scripts/phase19-smoke.ts), [CI](https://github.com/garontherocks/opsledger/actions/runs/38014060972) | No unverified pass, live semantic success or actual human approval inferred |
| Fixed registry reliability with authenticated Docker Hub pulls | Infrastructure remediation, credential handling reviewed | [registry analysis](../phase17-registry-remediation.md), [CI workflow](../../.github/workflows/phase4.yml) | Exact version tags preserved; mutable tags are not immutable provenance |

## Actual specialist resource comparison

Original implementation context: `15dba1139bfd8291500a87aecb6510ad99797a75`; Ollama 0.34.0, `qwen3:8b-q4_K_M`. Values are the accepted single local bundle, not a fresh M6 benchmark.

| Mode | Pairs | Calls | Reported tokens | Total observed latency (ms, rounded) | Prompt characters | Exact labels |
|---|---:|---:|---:|---:|---:|---:|
| Direct | 8 | 8 | 4,284 | 22,898 | 10,178 | 2 |
| Agent as tools | 8 | 24 | 14,109 | 67,624 | 37,255 | 2 |
| Handoff | 8 | 24 | 13,671 | 62,885 | 35,004 | 2 |

There were 24 paired rows, 56 calls and zero provider failures across the bundle. Exact labels are a fixture-specific diagnostic, not a semantic accuracy rate. Token/character counts are resource proxies, not monetary invoices. Representative human review rejected reopen/isolation/audience in all modes and accepted missing-context cases in all modes. Repetition consistency is not an invented second set of individual human judgments. No default specialist adoption.
