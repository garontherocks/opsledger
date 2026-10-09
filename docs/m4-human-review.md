# Completed M4 human semantic/security review — 2026-10-09

Source: the user's explicit final M4 checkpoint. These are user-reported judgments, not inferred from fixtures or contract validity. No bundle was rerun or tuned to document this checkpoint.

| Sample | Actual human judgment |
|---|---|
| reopen-en baseline | Edit |
| reopen-en retrieval | Reject |
| isolation-es baseline | Edit |
| isolation-es retrieval | Reject |
| poison-en retrieval | Accept |
| absent-es retrieval | Accept |

Retrieval provenance/integrity worked mechanically. Correct retrieval did not reliably produce better semantic reasoning. Retrieval remains experimental and is not adopted by default. No semantic percentage, generalization, model/prompt promotion or product-value claim follows from these selected samples. Adversarial asymmetric context is not a fair paired benefit aggregate; literal citation integrity does not establish semantic support.

## Actual desktop observation

The user reports completed=true, fixture=false, generations=16, providerErrors=0, contractFailures=0, automaticQualityAcceptance=false and defaultRetrievalAdoption=false. Model qwen3:8b-q4_K_M; expected Ollama runtime 0.34.0; corpus SHA c55eee55fcfeb4c31e0b252a1573156e2a9d41b4. Expected runtime is recorded as supplied, without inventing additional runtime, hardware or digest measurements. Zero contract failures do not establish semantic quality. See [checkpoint evidence](../evidence/m4-human-checkpoint.json).

## Actual human HITL security judgment

**Accepted for the limited M4 scope.** A failed required check cannot be approved; approval is bound to a specific action/receipt/SHA/identity/expiry, is one-time consumable, and the only authorized side effect is storing one local report. It grants no merge or release authority.

This records the user's security judgment, not a newly performed UI approval or report write. Fixture approvals remain test evidence. Required deterministic checks remain authoritative. All process/JS-isolation, trusted-source/secret, same-owner-reviewer and limited-lab caveats in the [engineering report](m4-engineering-report.md) remain unchanged.
