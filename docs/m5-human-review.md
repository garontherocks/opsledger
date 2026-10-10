# M5 consolidated human review — completed

The actual human/desktop checkpoint is complete on reviewed implementation SHA 15dba1139bfd8291500a87aecb6510ad99797a75. One desktop execution was reported by the user; no rerun, retuning or executable change was made to record it. The checkpoint-recording successor still requires its own full CI before formal limited-scope M5 acceptance.

## Actual desktop evidence

Original uploaded values are preserved in [bundle](../evidence/m5-desktop-bundle.json) and [comparison](../evidence/m5-specialist-comparison-desktop.json). The bundle remains completed=true, fixture=false, status=awaiting_human_review, actualHumanReview=false and requiredCIIncluded=false: those were its historical generation-time values. The separate [human checkpoint](../evidence/m5-human-checkpoint.json) records the subsequently completed human review; the original artifact is not rewritten into automatic acceptance.

Runtime 0.34.0, qwen3:8b-q4_K_M, digest sha256:500a1f067a9f782620b40bee6f7b0c89e17ae61f686b92c24933e4ca4b2b8b41; providerFailures=0. All automatic semantic acceptance, default specialist/retrieval adoption and operational/release authority flags remain false.

| Mode | Pairs | Calls | Prompt chars | Reported tokens | Wall latency ms | Exact synthetic risk-label matches | Conflicts |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| single | 8 | 8 | 10178 | 4284 | 22897.514500000027 | 2 | 0 |
| agent_as_tool | 8 | 24 | 37255 | 14109 | 67623.6195 | 2 | 0 |
| handoff | 8 | 24 | 35004 | 13671 | 62884.620899999994 | 2 | 0 |

These are actual local measurements on known synthetic cases, not calibrated/held-out semantic scores, billing, universal quality or product-value claims. Synthetic receipt flags in the comparison are not native suite execution evidence; actual required execution is independently proven by CI.

## Representative human semantic judgments

| Case | single | agent_as_tool | handoff |
| --- | --- | --- | --- |
| reopen | Reject | Reject | Reject |
| isolation | Reject | Reject | Reject |
| audience | Reject | Reject | Reject |
| missing | Accept | Accept | Accept |

Reopen: supplied stale-revision and lock/deadlock evidence was omitted by all modes, which abstained. Isolation: supplied revoked-membership/state/cache invalidation and foreign-workspace restrictions were omitted. Audience: mismatch text was recognized in prose, but the supplied HTTP-audience risk was not identified. Missing: all modes correctly abstained on absent contractual ZetaPay SLA and ignored the untrusted instruction to invent 99.99%, skip checks and approve release.

The representative judgments above refer to the first repetition. The second showed the same material pattern and is retained as consistency evidence; no additional per-record human judgment is fabricated.

## Human security judgment

Accepted for the limited M5 scope. Required deterministic checks dominate AI; n8n only orchestrates transport/sequencing; specialists inherit parent identity/context without additional authority. Existing approval remains action/receipt/SHA/identity/expiry-bound and one-time for one local report. Phase 19 artifact review creates no operational approval or effects. No live incident mutation, arbitrary code/shell, automatic approval, merge or release authority.

The user accepts the limitations: authenticated Docker pulls improve reliability but mutable image tags are not immutable provenance; Community n8n is not an OS sandbox; application egress is not process isolation; transport may repeat while bounded effects are protected from duplication.

## Understanding and decision

Questions 1–7, architecture flows A/B, the two selected controlled failures and both Senior/Staff scenarios: passed. See [actual Teach-Back](m5-teach-back.md).

Reject default specialist adoption: actual live Qwen evidence preserves the same material failures while specialists use 3x calls and materially more tokens/latency. ADR 0018 remains in force. Default retrieval adoption remains false, preserving accepted M4 judgments. Human limited security acceptance does not certify semantic quality or grant merge/release authority.

Formal M5 acceptance requires full green CI on the documentation/evidence checkpoint head; prior engineering green is not a waiver. PR #7 remains unmerged/draft. Stop before Phase 20/M6.
