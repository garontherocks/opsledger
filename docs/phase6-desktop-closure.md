# Phase 6 desktop closure record — 2026-10-08

Desktop validation and grouped human semantic review are completed with limitations. Phase 7 remains stopped and unauthorized. This record supplements the original engineering evidence; it does not assert production readiness or clear inherited release/M1 gates.

## Demonstrated by Víctor

The five conceptual answers and architecture explanation were supplied in his own words. They covered runtime versus weights, pinning, application-owned authorization and budgets, no model tools or incident mutation, releasing DB resources before inference, and post-inference membership/revision checks. The controlled provider failure was then reproduced on Windows: the API returned model_unavailable/503 while the incident remained readable, reported, revision 2. Restarting the lab provider restored generation (200, 4.289 seconds). The initial simple draft was accepted by Víctor for its observed content and exact citation; both successful live drafts were flagged truncated, so acceptance is not proof of complete generation.

Environment: Node 24.19.0, npm 11.17.0, Ollama 0.34.0, Ryzen 7 7800X3D, 64 GiB RAM and observed RTX 4070 Ti SUPER / 16 GiB VRAM. The live 8B runtime log showed 37/37 layers offloaded to CUDA. The pilot hardware label is descriptive, not per-model offload telemetry. Native PostgreSQL startup, migrations, seed, separate API/worker startup and login were demonstrated; this is not the full native roles/volume/crash/restore acceptance suite.

The first live request hit the 30-second limit; the runtime took about 20.8 seconds to load and prepare. Only local .env AI_TIMEOUT_MS was raised to the supported 120000 limit; source defaults and budgets were not changed. Subsequent live successes measured 22.170 and 4.289 seconds. These are distinct observations, not a cold/warm benchmark or production SLA.

## Matched desktop pilot

36 actual generations: three models × four existing synthetic cases × three repetitions. Every call succeeded; prompts and settings matched within the desktop batch. Ollama/model digests are in evidence/phase6-desktop-pilot.json. Context 4096, output cap 256 tokens, temperature 0, seed 42, thinking off, keep_alive 0, concurrency 1, request limit 120 seconds. The existing pilot was copied temporarily under ignored .local and adapted to include 8B and write separate evidence; no product or committed harness change was made.

| Model | Median latency | Mean latency | Truncated |
|---|---:|---:|---:|
| 0.6B Q4_K_M | 1.586 s | 2.288 s | 0/12 |
| 1.7B Q4_K_M | 1.999 s | 2.016 s | 0/12 |
| 8B Q4_K_M | 3.825 s | 3.791 s | 3/12 |

All three texts per model/case were identical in this batch, including errors. CPU evidence from the earlier environment is retained separately and is not a matched hardware performance comparison. The desktop fixture byte digest differs from Linux only because of CRLF line endings: desktop 439ebf3b44d21e0541a60c326dc7793c69a050cbfd6b2f0bdc5c551cf1986e60; Linux LF 9306bea665817ec01d82cf22ad2f6780076af3536a229ce0d7c41c26acd8eadf. Conversion of the existing fixture to CRLF reproduces the desktop hash exactly.

## Human decisions and findings

Víctor rejected 0.6B's repair/closure claims while the fixture remained reported. He rejected 8B as-is (or would edit) for changed event IDs and incomplete risk analysis. He prefers directly reading short timelines, retaining AI only as optional assistance under human review. Long/complex timeline benefit remains a hypothesis, not validated value.

Assistant inspection additionally found 1.7B conflating event and incident IDs and treating proposed checks as verified guarantees; 8B separated observation and hypothesis better on the 403 case but labeled unreviewed QA text Human-Reviewed, added next steps beyond the summary instruction and truncated all three risk analyses. No model is approved for automatic draft acceptance or operational action.

Review was grouped by relevant failure class plus one live simple example, not 36 individual acceptances. Raw pilot humanReview fields intentionally remain pending; separate evidence/phase6-desktop-review.json records the actual learner decisions without fabricating per-run approvals. Security understanding is supported by the learner's conceptual/architecture answers and rejection of injected claims; no separate interview role-play or additional unperformed boundary test is claimed.

## Remaining limits and scope

No further reruns are required for these completed desktop cases. Historical engineering reports remain evidence of their original session, supplemented by this record. Inherited native least-privilege, multiworker/crash/restore and remote CI/release gates remain open. This desktop closure does not silently clear them or certify every roadmap checkpoint item. No Phase 7 implementation, model acceptance automation, merge to main, squash or history rewrite is authorized by this record.
