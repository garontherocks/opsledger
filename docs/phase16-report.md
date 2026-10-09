# Phase 16 — Durable bounded QA workflow and HITL

## Completed / architecture

Existing TypeScript controller + PostgreSQL, no new runtime dependency. Additive migration 0008 keeps workflow leases/check receipts/approval ledger/reports distinct from Phase 15 state/history/memory. Four reviewed fixed lab checks execute using process.execPath and explicit argument lists, shell=false: domain/policy (48 units), QA context, MCP and Skill/HTTP. Source checkout SHA and tracked executable-input cleanliness are checked before/after execution. Generated evidence files do not invalidate executable-source checks. Full native/build/audit/browser CI remains independent and authoritative; the local registered suite is **not full CI or a release verdict**.

Run routing: scoped context checkpoint → bounded check claim → immutable actual receipt → awaiting review → approve/deny → one local report write. Each read/write revalidates owner/workspace membership and signed state/history; execution releases DB resources and revalidates after completion. Thirty-second claims permit at most two read-only check attempts; expired/late attempts are fenced. Read-only suite replay after crash is possible and explicitly distinct from exactly-once transactional report effects.

The loopback lab UI is opt-in (QA_LAB_ENABLED=true, nonproduction LAB_MODE=true, explicit reviewed QA_TARGET_SHA). It displays source provenance, registered check results, SHA, action digest, reviewer and expiry before consuming approval. Session identity is server-derived. Only scoped lead/admin may approve their owned run; this is not a two-person separation-of-duties system.

## Security review

Approval binds run/workspace/owner, reviewed SHA, immutable receipt hash, action digest, context digest, reviewer identity and ≤5-minute expiry. Recheck all fields and current target/role within the effect transaction. Append-only signed approval/report rows and unique run/approval constraints resist replay; transaction rollback leaves a recoverable prior stage. No commands/paths/generated code/permission changes accepted from model or request. AI is optional/unverified, not an operational decision authority. No incident writes, auto-merge, release, shell endpoint, paid inference or M5 technology.

Process/JS egress guards remain intact on existing registered MCP/AI lanes; they are not an OS/native/child sandbox. Trusted source checkout, installed dependency integrity and application-secret protection remain assumptions. Git validation detects changed tracked executable inputs, not hostile concurrent filesystem/native actions; there are no such model capabilities. Approval protects the transactional immutable report effect, not arbitrary external rollback.

## Validation / evidence

Phase 15 all-lane CI passed at 7018867f64b058c08026b808085e8254214a7bb3 / run 37957661131 before Phase 16 began. [Receipt](../evidence/phase15-ci-receipt.json).

Eight workflow scenarios plus authenticated API tests verify required-gate failure, invalid/malicious request fields, denial, SHA/action/identity binding, expiry, replay/concurrency, revoked access during execution, commit-time target change, rollback and fenced recovery. Native probes SIGKILL an independent child at six durable boundaries (context, claim, receipt, approval, report, committed-report acknowledgement loss), then rehydrate and assert one stored report. A separate real registered-runner test executes approved check scripts on Linux and Windows with their actual checkout SHA. Browser QA flow uses fixture check receipts with real auth/API/native DB; it does not manufacture actual human approval/model success.

Local PGlite initially dropped a pooled socket after an intentionally failing auto-commit DELETE: node-postgres discarded the error connection and the single-client socket raced reconnect. Expected trigger-denial tests now explicitly BEGIN/ROLLBACK on a borrowed connection and assert SQLSTATE P0001. No retry, sleep, weaker denial assertion or product workaround. Native abrupt-process recovery remains required; local PGlite does not claim it.

Exact phase/final CI receipts are recorded after completion. The M4 desktop harness was exercised with fixtures only (16 deterministic abstentions, not live model evidence). Original M3 9/9 turn_budget/zero drafts and both actual engineering failures remain unchanged.

## Trade-offs / learning / next

Small linear workflow, bounded evidence metadata and reviewed risk codes; no broad agent graph, arbitrary executable tests or autonomous operations. Explain lease fencing versus cancellation, read-only replay versus atomic effects, approval versus quality, and lab checks versus full CI. M4 human/desktop/Teach-Back pending until the user supplies actual outcomes. Stop before Phase 17/M5 regardless of engineering success.
