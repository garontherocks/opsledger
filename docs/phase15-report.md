# Phase 15 — Typed state, history, memory and recovery

## Completed / architecture

Additive PostgreSQL migration 0007; QaStore uses the existing pool and membership model. State is a strict signed typed checkpoint, history an append-only HMAC chain, and memory reviewed expiring risk codes with source SHA/digest/context provenance. No transcripts, free-text secrets, commands or persistent instructions are accepted as memory. All records are workspace/owner scoped. Rehydration revalidates current membership, approved SHA, provenance, expiry and history integrity. Revision and UUID operation keys serialize/reject conflicting writes and deduplicate identical operations.

## Runtime comparison

An actual isolated LangGraph 1.4.21 interrupt/resume spike completed with no model or tracing: resumed successfully, node body entered twice, a new MemorySaver had no prior state. [Exact results and limits](../evidence/phase15-runtime-spike.json). Official persistence/interrupt and PostgreSQL 18 locking documentation were checked on 2026-10-09. Retain direct TypeScript + PostgreSQL for this small linear workflow. This is not a benchmark of PostgresSaver or a claim that LangGraph cannot be durable; application auth/idempotency still must be supplied and no needed extra capability was demonstrated. Project dependencies/lockfile remain unchanged.

## Validation

Six state scenarios cover atomic rollback, concurrent idempotency, poisoning, unreviewed memory, stale SHA/provenance, revoked membership, workspace/user isolation, expiry and append-only enforcement. Required native CI additionally launches a different Node process to recover committed state; the single-client PGlite socket cannot support the simultaneous child connection. The initial local child attempt exposed that harness limitation; it is not rewritten as successful native recovery. Local PGlite exercises the other assertions and instance rehydration; the evidence explicitly sets actualChildRestart=false there. Native CI must execute the child and report true before phase closure. No arbitrary timeout/sleep/retry is used to hide recovery.

The Phase 14 engineering gate completed first at 5628a6bb1bfc3891bcc9050237b375edeb490fa8 / run 37956355456, with API, browser and Windows green. [Receipt](../evidence/phase14-ci-receipt.json). Phase 15's exact native/full CI receipt is recorded before Phase 16 begins.

## Security / debt

Authorization locks serialize revocation with committed DB effects. No model-selected tool/command or operational action; operationalAuthority=false. HMAC integrity assumes the application secret is protected; DB owners can disable triggers, so this is not a malicious-superuser sandbox. Memory is bounded to a one-hour run and 32 events, invalidates on source/target change, and cannot grant authority. Native child probe is a reviewed fixed test script, not a model tool. Stronger cross-process restart after abrupt OS kill at each workflow boundary is Phase 16 work; arbitrary external side effects are excluded.

## Learning / interview defense / next

Explain why history cannot substitute for current state, why memory is scoped reviewed data, and why a framework's resume does not guarantee exactly-once side effects. Learning accumulates for M4. Continue Phase 16 only after this phase's deterministic CI gates pass; no Phase 17/M5.

## Actual engineering closure

Native state tests (7), independent Node recovery and all required API/browser/Windows lanes passed on 7018867f64b058c08026b808085e8254214a7bb3, run 37957661131, before Phase 16 started. [Receipt](../evidence/phase15-ci-receipt.json). Local single-client failure remains in [development evidence](../evidence/phase15-development-failure.json). Phase 16 strengthens expected SQL-trigger denials to exact P0001 on an explicit borrowed-client transaction; scope and state semantics are unchanged.

