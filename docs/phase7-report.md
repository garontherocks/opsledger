# Phase 7 — Structured outputs and eval foundations

## Status and scope

Phase 7 was explicitly authorized by Víctor on 2026-10-08 after the Phase 6 learner/desktop closure (cccafb47a8921a84a758568b0674ed7f83c29c95). Engineering implementation and deterministic acceptance/eval evidence are available. Browser acceptance, actual structured inference on the desktop and the Phase 7 learner/human checkpoint remain pending. Phase 8 is not started. Inherited native/remote release gates are not cleared.

## Behavior

The incident summary now requires a strict Zod model contract: status draft/abstain/refusal, exact incident state, bounded summary, event-ID/observation entries and explicit unknowns. The same schema is converted to draft-07 JSON Schema and sent to Ollama's format field and prompt. Unknown root/nested fields, invalid JSON, unsupported markup/active URL schemes/control characters, truncated responses, state mismatch, duplicate/foreign event IDs and invalid refusal shape are rejected with safe 503 failures. Unsafe content is checked after JSON decoding as well as before parsing; Unicode escaping does not bypass it. This is a narrow defensive content policy, not a general semantic safety detector. No automatic repair, retry or fallback to legacy free text is performed.

The provider's existing prompt limit 12000 characters, raw response 32768 bytes, text 8000 characters, context 4096, local literal IPv4 loopback, pinned model digest, timeout bounds, no redirects, single active inference and pre/post membership/revision checks remain. Structured generation has a bounded 768-token cap because Phase 6 showed 256-token truncation; the historical free-text pilot keeps 256. This change affects latency/comparability and has not yet been validated with actual Phase 7 inference. Local .env timeout overrides are not committed.

UI accept/edit/reject decisions are ephemeral local session decisions, not saved incident content or domain actions. Refusal/abstention is displayed without an accept action. React renders model and edited content as plain text. Provenance explicitly describes the original generation; human edits do not become verified model citations. New generation or incident revision remount clears the local review. No database migration or dependency is introduced.

A separate strict RiskProposal contract supplies observations, hypotheses, risks, proposed checks and unknowns for the synthetic QA pilot. This is an offline experiment, not a QA operational agent or a release decision maker. The actual live pilot is opt-in, bounded and writes raw/validated evidence under ignored evidence/desktop-private.

## Tests and evals

35 unit checks passed, including strict/nested schema behavior, provider format and budget, refusal, truncation, forged citation, Unicode-escaped unsafe markup, and a semantically false response whose state and citation are valid. Integration passed 63/64 with the inherited native-only case skipped. The updated browser test covers outage recovery, local accept/edit/reject, safe literal human edits, no incident transition and revision invalidation, but its execution is blocked by unavailable Chromium: both default 156 and historical 141 archive downloads were invalid. No browser or accessibility pass is claimed.

Versioned dataset: tests/fixtures/phase7-eval-v1.json (13 deterministic model-like outputs). Versioned oracle: bounded-literal-oracle-v1, in the dataset. Eight development and five held-out cases are reported separately; held-out outputs are not provider prompt examples. This split is consumed by this run and is not fresh evidence for future prompt tuning. Oracles are bounded literal required/forbidden checks, not a general truth judge. No oracle labels are sent to the live provider.

Evidence/phase7-eval-report.json preserves raw and validated outputs. All 13 expected boundary outcomes matched; two contract-valid falsehoods fail the fixture's semantic oracle, intentionally demonstrating schema validity is not truth. Eighteen actual Phase 6 timeline outputs are replayed as the historical free-text baseline and rejected by JSON parsing. This tests compatibility boundaries; it does not prove structured generation quality improved. Raw risk/failure analysis outputs are not misclassified as product summaries. Every humanReview remains pending until learner judgment occurs; there is no automatic quality acceptance.

## Decision and remaining work

Keep direct timeline reading as the Phase 6 accepted baseline for brief timelines. Phase 7 contracts improve integration predictability and enforce identity/state checks, but factual claims with valid citations remain unverified. Actual desktop generation and one grouped review are required before model quality acceptance. Do not fix a false claim by weakening authorization, state, revision or release gates.

See phase7-desktop-validation.md for one bounded desktop batch and phase7-learning.md for the six-part checkpoint. No new native database role, embedding/retrieval system, model tools, automatic mutation or hosted deployment is included.

## Sources

Official Ollama structured-output documentation: https://github.com/ollama/ollama/blob/main/docs/capabilities/structured-outputs.mdx (format schema and application revalidation).
Official Zod JSON Schema documentation: https://zod.dev/json-schema (z.toJSONSchema, strict additionalProperties, draft-07 target). Checked 2026-10-08; these moving documentation pages are not proof of the pinned runtime's observed behavior. Unit provider fixture validates the submitted request; actual runtime compatibility remains a desktop check.
