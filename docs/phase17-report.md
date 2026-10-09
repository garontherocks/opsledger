# Phase 17 — signed n8n orchestration, engineering gate pending

Base: accepted M4 merge 7cd2ca0ba226c2979a887a5f987874208ce6a279. Separate optional TypeScript service over the existing QaWorkflow; main incident/UI behavior is untouched. n8n 2.42.6 Community is an infrastructure runtime, not a product dependency or new authority source. Official webhook/security/CLI/license docs and exact release checked 2026-10-09; references are in lab/n8n/README.md.

Reviewed flow: signed completed/check-receipt run reference → authenticated one-run service → current scope/source validation → durable event lease/deduplication → fixed receipt state → bounded unverified triage or inconclusive → existing human approval → one existing transactional report effect. No generated commands, arbitrary shell/code, model-selected URL, incident write, auto-approval, merge or release. Business rules remain TS. The signature binds schema/body/run/workspace/SHA/time/operation/approval ID. The bearer is separately scoped to one owning reviewer/run and expiry. n8n holds neither application AUTH_SECRET nor the operator signing key.

Replay semantics: the same event/body returns its signed durable receipt without re-execution, only after current membership/source/grant/window checks. A changed body under the same ID is denied. In-flight duplicates return pending. Expired event lease recovers; a committed report is reconciled against the exact bound approval after acknowledgement loss. Report uniqueness and approval expiry remain M4's DB-enforced effect boundary, not an n8n prompt. Inspection results are historical receipts; fresh state requires a new signed event.

Local deterministic cases: forged signature/bearer/time/scope/commands, duplicate ID/body mismatch, hostile triage, deadline, failed checks, approval required, lost acknowledgement/restart, cached-result revocation/expired grant. Required native CI and actual n8n webhook/export test are pending. Work has no Docker; this limitation is explicit. Synthetic triage/approval tests do not claim live model quality or actual human approval.

Development evidence: an initial native Node run rejected TS constructor parameter properties (strip-only mode); explicit fields fixed it without enabling transforms. The malformed-command test initially called the strict signer before HTTP; it now sends an explicitly invalid signature and verifies the server schema denial. Neither was model/MCP evidence. Existing Windows/lifecycle/expiry failures and M3 9/9 turn_budget/zero drafts remain preserved.

Threat/limitations: current trusted source/dependencies/secret and same-owner approval assumptions remain. Native self-hosted n8n is not an OS sandbox; the actual CI container uses an internal-only network with excluded risky nodes and no telemetry. HTTP node retries are bounded/idempotent, not exactly-once delivery. Signed event MACs do not protect against compromised service/signing/application keys. Community license/features and privileged workflow editing are recorded; no SaaS claim.

Phase 18 must wait for this phase's full required gates. M5 authorization covers Phases 17–19; stop before Phase 20/M6. Accumulate learning and one material desktop/human checkpoint at M5.

## New service expiry boundary

Controlled regression reproduced a denied response after a report write when the new service grant expired during the final SHA await. [Actual red evidence](../evidence/phase17-delegation-expiry-regression.json). The server-only delegated deadline now joins approval/event-window expiry at the transactional INSERT and after-await check. It is not a model/request field; default M4 consumption is unchanged. Revalidation only after writing is insufficient. Native/full correction CI remains required.
