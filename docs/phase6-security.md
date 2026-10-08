# Phase 6 security and dependency review

The application authorizes a local draft request, not a model decision. Identity, active workspace/object scope, current revision, post-inference recheck, server feature flag and capacity checks are independent of model text. Summary generation uses no domain write/tool executor. SQL connection is released before inference. Browser model output is literal escaped text; no Markdown HTML/parser or generated command execution.

Context excludes account/session/credential tables, cookies and request headers. It contains only selected bounded incident/activity evidence, with selected credential-pattern and AUTH_SECRET redaction. That heuristic cannot discover every secret in arbitrary prose; this phase is synthetic-lab-only and production AI enablement is rejected. Default logs capture IDs, hashes, model/runtime/usage/latency, not raw prompt/response. Pilot export is an explicit opt-in bounded synthetic artifact.

Provider uses fixed /api/version, /api/tags, /api/generate on a configured literal loopback HTTP origin. Redirects are denied; model tag is a fixed server allowlist; full locally installed GGUF manifest digest is checked before each generation. Request bodies cannot provide URLs/prompts/model selection. A missing/mismatched model, deadline, invalid/oversized response or busy capacity is a failure; there is no hosted fallback or retry loop. The owned Ollama runtime binds loopback with cloud features disabled. The daemon/local operator remains trusted: this is not a network firewall, protection from a compromised runtime or multi-user machine isolation.

## Actual finite failure evidence

HTTP fixture tests establish manifest pinning, bounded options, deadline cancellation, output byte limits and no redirect to a second origin. SQL/API provider fixtures establish denied scope/stale input before compute, post-inference revocation/revision suppression, no incident/audit mutation and outage recovery. Browser fixture tests establish escaped script-looking output, visible human-review warning and revised-evidence invalidation. Actual Ollama API smoke stops/restarts the owned daemon: 503 during outage while incident reads stay 200, then successful generation with revision unchanged.

Live pilot exposes prompt-injection/grounding failures; it is not a safety pass. Both small models repeat malicious repair/closure language; a 1.7B output mislabels an event as incident identity and abbreviates a citation. Human review is still pending. No operational capability exists for these false claims to invoke.

## Runtime/model/dependency review

No new npm dependency. npm audit covers the existing lockfile, not the native runtime/model loader. Ollama 0.34.0 official Linux binary archive was SHA-256 verified against release metadata (cf95886728959aa09910bb34de5cca1cc5a8f68003b5597197d3f2c2d57c0804); observed runtime API reports 0.34.0. Project license is MIT. Qwen3 0.6B/1.7B Q4_K_M model pages list Apache-2.0; installed manifests match full recorded SHA-256 hashes. No weight/binary redistribution in delivery.

Primary advisory review: GHSA-x8qc-fggm-mpqg lists a GGUF loader issue affecting versions below 0.17.1. GHSA-r4wp-gg33-whwg has incomplete/unreviewed version metadata for pull SSRF. Maintainer issue #17041 describes a related tensor-redirect path; do not infer a blanket security guarantee from a version or empty maintainer advisory page. Version 0.34.0 is newer than the disclosed ranges inspected, but no complete binary CVE scan or universal patched claim is made. Only trusted official fixed-tag models were pulled during operator setup; application clients cannot access pull/create/push endpoints. Keep the daemon loopback-only and stop the owned experimental processes after use. Recheck advisories before a runtime upgrade or deployment.

Native M1/roles/worker/volume/crash/backup and remote CI gates remain open. AI startup requires nonproduction lab mode; no public exposure, hosted inference, customer data or paid API was introduced.
