# Phase 14 — QA RAG and bounded context

## Completed / architecture

Separate run-scoped QA index, pinned vector-space identity and bounded context assembly over five reviewed current product contracts/ADRs/failure reports at accepted main c55eee55fcfeb4c31e0b252a1573156e2a9d41b4. No product runbook index, arbitrary repository traversal, URL loading or model-selected filesystem path. Existing embedding provider/normalization is reused. Every chunk retains path, SHA and document hash; sources remain untrusted.

## Validation and adoption decision

Three deterministic tests passed locally, including a paired no-retrieval versus retrieval experiment over five explicit evidence needs. See [paired record](../evidence/phase14-paired-context.json). The baseline receives no supplemental QA evidence; retrieved coverage is a plumbing measure, not plan correctness or value. The feature is **rejected for default agent adoption**: deterministic lexical fixture retrieval cannot establish live strategy-selection benefit. M3's actual 9/9 turn-budget blockage with zero drafts remains unchanged. Live paired semantic comparison is deferred to the single M4 desktop bundle; it cannot retroactively turn this fixture into quality evidence. Rejection is the roadmap's permitted Phase 14 outcome.

Required CI on this phase's exact commit is recorded separately before Phase 15 begins. No human answers or additional desktop outcomes inferred.

## Security review

Integrity/hash mismatch, stale SHA, changed model/digest/vector space, cross-workspace/user access and revocation before/during inference deny context. Poisoned content is data with operationalAuthority=false; the index exposes no executor. No guards, required checks or M1–M3 behavior changed. No dependencies introduced.

## Trade-offs / debt

This reviewed repository snapshot is an experimental QA evidence corpus, not live tenant ingestion. Its in-memory index deliberately expires at process lifetime; rebuild on changed SHA/vector space. Real corpus lifecycle adapters and fresh calibrated bilingual QA-plan evals remain required before adoption. The existing embedding provider's runbook-oriented prefix is preserved and not asserted to be optimized for QA evidence.

## Learning / interview defense

Distinguish retrieval mechanics, relevant evidence coverage and actual decision quality. Explain why a valid cited artifact cannot grant permissions and why a retrieval feature can be correctly rejected despite green plumbing tests. Material is accumulated for the M4 consolidated checkpoint; no phase-level Teach-Back.

## Next phase

Only after required phase CI passes, continue Phase 15 under the user's explicit M4 authorization. Stop after Phase 16, before M5.

## Actual engineering closure

All required API/browser/Windows lanes passed on 5628a6bb1bfc3891bcc9050237b375edeb490fa8, run 37956355456, before Phase 15 started. [Receipt](../evidence/phase14-ci-receipt.json). [ADR 009](adr/009-qa-context-adoption.md) formalizes the same default-adoption rejection documented at the Phase 14 boundary; no later claim of semantic benefit is substituted.

