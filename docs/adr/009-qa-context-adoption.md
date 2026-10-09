# ADR 009 — Keep QA retrieval experimental, reject default adoption

Status: decision taken in Phase 14; retained through M4.

Problem: QA planning needs scoped current product evidence, but more context can add stale/poisoned text without improving decisions.

Decision: implement an isolated run-scoped QA index and bounded provenance-preserving assembly; **do not adopt retrieved context as the agent default**. Keep fixed mandatory evidence/no-retrieval as the paired baseline. Product runbook retrieval, mandatory tools and policy remain independent.

Evidence: [Phase 14 report](../phase14-report.md), [paired mechanics](../../evidence/phase14-paired-context.json), [all-lane gate](../../evidence/phase14-ci-receipt.json). Five known cases found the requested evidence; lexical fixture coverage does not establish QA strategy correctness or useful live improvement. Actual M3 was 9/9 safe turn_budget and zero drafts; that is not rewritten, nor taken as proof that QA retrieval would help or hurt another task. Rejection is a valid roadmap exit, not a quality-threshold waiver.

Alternatives: append all repository docs (reject unnecessary context/attack surface); reuse product tenant index (reject authority/lifecycle coupling); assume retrieved citations prove quality (reject integrity/truth confusion); adopt blindly (reject absent value evidence).

Consequences: M4 has a functioning experimental context path and a single optional paired desktop experiment, with the same mandatory evidence in both lanes. No automatic adoption or model/prompt promotion follows the small known dataset. A future fresh calibrated bilingual held-out evaluation and paired product-value measurement are prerequisites for a quality/value claim. Existing M2 promotion policy remains unchanged.
