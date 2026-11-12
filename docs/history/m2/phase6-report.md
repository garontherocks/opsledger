# OpsLedger — Phase 6 execution report

> **2026-10-08 update:** Desktop validation and grouped human review have now been performed. See [desktop closure](phase6-desktop-closure.md) and the separate desktop evidence. Earlier pending statements below describe the original session; inherited release gates remain open and Phase 7 remains stopped. No unperformed learner exercise or per-run approval is implied.

2026-10-08. Branch: feat/local-ai-assistance. Validated implementation commit: aa2320a2327b083bbb07ce653146b39986e13802. Prior delivery: 2e208fece2d5cd9d423ff4993df0724e7ed8b6c9.

Engineering implementation and local checks are available. Full Phase 6 completion is pending human semantic review, learner demonstration and the documented desktop model validation. Inherited native/remote release gates remain open. Phase 7 has not begun.

## Required report fields

| Field | Result |
|---|---|
| Completed | Optional local incident timeline draft, server/UI feature flag default off, scoped read-only snapshot, ephemeral output/provenance, bounded pinned Ollama provider, failure recovery, labeled pilot and review materials. Failure-summary/change-risk work is a synthetic pilot experiment; no operational QA agent or automatic action is implemented. Human-reviewed examples and learner demonstration remain pending. |
| Architecture | Application-owned authorization/revision checks before and after inference; release SQL connection before generation. Fixed local provider and model/digest allowlist, one active call, no queue/retries/tools/domain mutation. Plain-text model output sits inside a typed transport envelope; truth-validated structured output is not claimed. ADR 008 documents small CPU smoke candidates without replacing the planned desktop 8B validation. |
| Validation | Clean locked install, lint/typecheck/build, 19 unit passes, 62 integration passes plus one native-only skip, 7 browser flows, startup smoke, embedded restore and 90 conventional route measurements. 24 actual pilot generations and authenticated live API generation/stop/restart recovery passed their execution checks. npm audit reports 0 vulnerabilities; this does not audit the downloaded runtime. |
| Security | Active membership/object/revision guards, local literal loopback origin, fixed paths, no redirects/cloud fallback, model manifest pin, deadlines/input/output/concurrency/rate budgets, escaped UI and metadata-only success logs. Synthetic-context selected secret redaction is heuristic; no universal secret-detection guarantee. Malicious notes can still corrupt meaning; model output has no operational authority. |
| Evidence | evidence/phase6-* contains final logs, boundary results, browser summaries/screenshot, runtime/model receipts, 24 raw synthetic outputs, actual API outage/recovery, conventional restore/performance and audit. Source fixture, scripts, architecture/security/startup/review/learning documents and draft PR are included in the source/evidence archive with full git history and checksums. |
| Trade-offs / Debt | Human accept/edit/reject review pending; pilot showed unsupported claims and faulty citations. CPU 0.6B/1.7B smoke is not desktop 8B/GPU acceptance or production value/SLA evidence. Browser override is Chromium 141 rather than Playwright's current default download. Native PostgreSQL, separate worker, least privilege, volumes, process-kill/native restore and actual remote CI remain pending. No hosted deployment or remote PR. |
| Learning | Runtime versus model weights; pinned inference as an untrusted text function; deterministic authorization versus probabilistic correctness; prompt injection without tools; measured pilot versus demonstrated usefulness. Larger candidates still require matched evidence and human review. |
| Teach-Back Checkpoint | docs/phase6-learning.md contains all six required items and exactly five practical questions, diagram explanation, controlled failure, security boundary, interview scenario and concrete evidence. Worksheet and demonstration are pending; no learner answers or human judgments are invented. |
| Interview Defense | Explain why tool-free local inference preserves deterministic authority yet can invent repair/closure or misuse evidence IDs; defend post-inference scope checks, bounded resource use and refusal to call the pilot a quality pass. |
| Next Phase | Phase 7 — Structured outputs and eval foundations. |

## Executed validation

| Command | Result / evidence |
|---|---|
| npm ci --ignore-scripts | Passed; phase6-clean-install.log |
| npm run lint | Passed; phase6-lint.log |
| npm run typecheck | Passed; phase6-typecheck.log |
| npm run build | Passed; phase6-build.log |
| npm run test:unit | 19 passed; phase6-unit.log |
| npm run test:integration | 63 results: 62 passed, 0 failed, 1 native-only skipped; phase6-integration.log |
| PW_CHROMIUM_EXECUTABLE=/workspace/scratch/560ad081e51c/opsledger/.local/chromium-1194/chrome-linux/headless_shell npm run test:e2e | All 7 flows passed, no flaky/retried/skipped tests; phase6-e2e.log and phase6-browser-summary.json. Existing login expectation compared without updating snapshots. |
| npm run quality:baseline | Passed isolated quiesced embedded DB/files restore and 3 × 30 successful serial route requests; phase6-baseline.log, phase6-restore.json, phase6-performance.json. No native restore or network SLA claim. |
| node --experimental-strip-types scripts/startup-smoke.ts | Passed migrations/seed repeat, real HTTP readiness, built SPA and login; phase6-startup.log |
| npm audit --json | 0 reported npm vulnerabilities; phase6-audit.json |
| npm run ai:pilot (owned loopback Ollama runtime, two pinned candidates) | 2 × 4 synthetic cases × 3 repetitions = 24 actual generations; phase6-live-pilot.json and phase6-runtime-pilot.log. No automated semantic acceptance verdict. |
| npm run ai:live-smoke | Actual authenticated summary 200, owned daemon stopped → summary 503 / incident read 200, restart → summary 200; revision stays 2. phase6-live-api.json/log. |

Provider unit tests use local HTTP fixture servers; SQL integration and AI browser tests use an explicitly labeled provider fixture. Those tests establish enforcing boundaries, not model quality. The pilot and live API smoke use actual inference. The UI screenshot was visually inspected: model-like HTML is rendered literally with a visible human-review warning. Selected draft axe state has zero reported violations; this is not complete accessibility certification.

The resumed environment exposed a timezone-dependent expired-session fixture. It now writes explicit UTC into the existing UTC timestamp-without-zone auth convention; expected 401 and product authorization remain unchanged. All integration checks then passed.

## Actual local inference and quality limits

Ollama 0.34.0 official Linux archive SHA-256: cf95886728959aa09910bb34de5cca1cc5a8f68003b5597197d3f2c2d57c0804. Owned runtimes bound to 127.0.0.1 with cloud disabled; experimental processes were stopped. Model full digests and licenses are recorded in phase6-model-manifest.json and official references in docs/phase6-sources.md. Runtime binaries, model weights, private keys and daemon logs are excluded from delivery.

| CPU candidate | Actual generations | Mean elapsed | Range |
|---|---:|---:|---:|
| qwen3:0.6b-q4_K_M | 12 | 3.260 s | 2.150–4.450 s |
| qwen3:1.7b-q4_K_M | 12 | 9.235 s | 7.465–13.785 s |

Shared CPU, cold reload (keep_alive=0), context 4096, output 256 tokens, three repetitions of four labeled synthetic cases. Host: AMD EPYC 9V74, 9 visible logical CPUs, approximately 10 GiB host RAM / 8 GiB cgroup limit; no GPU observed. These are execution timings, not matched desktop/GPU benchmarks or a performance recommendation. Dataset version: phase6-synthetic-pilot-v1; SHA-256 9306bea665817ec01d82cf22ad2f6780076af3536a229ce0d7c41c26acd8eadf.

Assistant inspection observed malicious-note outputs claiming repair/closure despite reported state, invented or abbreviated evidence IDs, and repetitive/incomplete change-risk text. These are observations for human review, not a human-approved score. Even the actual API example omits the requested event citation, so successful generation is not full prompt compliance. Review all claims against fixtures and record accept/edit/reject with reasons in docs/phase6-review-worksheet.md. Every humanReview field remains pending.

## Delivery and milestone gates

Source/evidence delivery excludes credentials, environment values, live/test databases/backups, private files, dependencies/builds, model/runtime/browser binaries and private traces. Earlier Phase 0–5 evidence is preserved; current reruns are copied under Phase 6 names. The v1 recording is the deterministic AI-off workflow, not a live AI demonstration. No new npm dependency was introduced.

M1 (Phases 0–5) has a local deterministic baseline but inherited native and remote gates remain pending. The next milestone is M2 — AI Product, covering Phases 6–10: its checkpoint is at the end of Phase 10 after engineering/eval/learning evidence. No calendar deadline is promised. Four phases follow this authorized Phase 6; Phase 7 is named only.

For actual GitHub CI, Víctor will create an empty opsledger repository and supply its URL. Current origin is a local Phase 0 checkout; no remote push, PR, merge or deployment has occurred. Human review, learner demonstration, personal-PC GPU/driver/VRAM and planned desktop model comparison must be recorded honestly before claiming closure.
