# M5 Teach-Back — human checkpoint completed

The user completed and passed the checkpoint on implementation SHA 15dba1139bfd8291500a87aecb6510ad99797a75. The original learning questions/scenarios remain below. These results record actual human completion supplied at the consolidated checkpoint, not inferred understanding.

## Seven questions

1. What does n8n orchestrate, and which TypeScript checks/identity/approval rules can it never override?
2. What exactly is bound by action/receipt/SHA/identity/expiry, and what does one-time approval authorize?
3. Why are authenticated Docker pulls a reliability remedy, and why are unchanged version tags not immutable image-digest guarantees?
4. How do specialist-as-tool and handoff differ in context/control, and why does identical context not imply correct reasoning?
5. What did the paired controlled comparison actually measure? Why are fixture labels/tokens/wall time insufficient for live semantic quality/cost claims?
6. How does risk routing preserve minimum gates, select additional suites and handle unknown changes?
7. Why do environment/model failure, stale SHA and disagreement yield inconclusive rather than an accepted/passed verdict?

Architecture Flow A: explain signed event → n8n → TypeScript → receipt/limited human approval, including the authority boundary and lost-ack recovery.

Architecture Flow B: explain change risk → minimum/additional execution → triage → mechanical eval → human artifact review, including which portions are fixtures and which execute actual registered tests.

## Controlled failures

- Failed minimum or additional suite: zero provider calls, blocked artifact cannot be reviewed into acceptance (qa-pipeline.unit.test.ts).
- Foreign workspace/reviewer, changed SHA or tampered report hash: artifact review denied; report review has no operational approval capability.
- Context omitted/poisoned or peer asks for authority: strict transfer/output denied; disagreement inconclusive (qa-specialists.unit.test.ts).
- Expiry during target verification: no M4 local-report effect (qa-orchestration.integration.test.ts); model output cannot extend expiry.

## Senior/Staff scenarios

1. CI validates a PR merge checkout while a human views a newer branch head. Explain exact code/data SHA binding, freshness, re-execution and why the older receipt cannot approve the new action. A hash is not authentication or semantic truth.
2. An n8n graph retries after a lost acknowledgment and a specialist claims it already approved release. Explain durable event recovery, one local report effect, parent identity/expiry and TS ownership. Distinguish idempotent bounded effects from exactly-once transport and Community configuration from an OS sandbox.

Human outcomes are recorded in m5-human-review.md and evidence/m5-human-checkpoint.json. No M6 or merge authority is granted by passing Teach-Back.

## Actual completion record

Questions 1–7: **Passed**.

1. n8n coordinates transport/sequencing/retries/branches; TypeScript owns identity/scope/SHA/expiry, registered checks, receipts and approval. n8n cannot turn failed checks into passes or create incident/merge/release authority.
2. Approval binds concrete action/receipt/SHA/identity/scope/expiry, is one-time and permits only the inherited bounded local-report effect.
3. Authenticated pulls improve reliability/rate limits; mutable version tags remain mutable. Immutable image identity requires digest pinning/verification.
4. Specialist-as-tool retains parent control; handoff transfers work/context to another role. Equal context hashes do not imply correct reasoning. The actual bundle showed the same errors across modes.
5. Calls/context/prompt chars/reported tokens/latency/conflicts/known synthetic labels are measured. Fixtures are not calibrated semantic quality, inference cost or product value.
6. Risk routing retains all minimum gates and only adds registered suites; unknown non-documentation changes select all additional suites. Models cannot invent executable paths/commands or remove checks.
7. Environment/model failure, stale SHA and disagreement remain inconclusive; prose cannot promote missing/stale/conflicting evidence to accepted/passed.

Architecture Flow A: **Passed**. Signed existing-run event → authenticated n8n transport → scoped TypeScript revalidation → durable receipt/check state → specific one-time human approval → one local-report effect. Lost acknowledgment can cause retry; durable deduplication/transactional uniqueness reconcile an already-performed effect. Idempotent bounded effects are not exactly-once transport.

Architecture Flow B: **Passed**. Reviewed change → deterministic routing → minimum/additional registered suites → fixed execution on verified SHA → unverified triage after checks → mechanical evaluation → bound artifact for human semantic review. Native registered CI execution is real; Phase 19 triage/review may be fixtures. M5 desktop is live Qwen on a small known synthetic sample.

Selected controlled failures: **Passed**. (1) Failed minimum/additional gate blocks the artifact, with zero provider calls; no model/specialist/human artifact review can reinterpret it into operational acceptance. (2) Approval expiry across asynchronous SHA verification must be revalidated after awaits and at the transactional effect boundary using the DB clock; expiry means deny/no effect. Other examples above remain learning material, not additional claimed human demonstrations.

Senior/Staff 1: **Passed**. An older PR merge-checkout receipt cannot authorize a newer branch head. Historical evidence remains valid only for its own SHA; changed code requires fresh execution. SHA binding is not authentication or semantic truth.

Senior/Staff 2: **Passed**. Transport retries cannot duplicate the protected bounded effect; specialist release claims have zero authority. TS policy and human action/receipt/SHA/identity/expiry approval retain control. Community n8n is not an OS sandbox; no merge/release authority.
