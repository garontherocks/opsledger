# Phase 6 primary references

Consulted 2026-10-08 UTC. These support protocol/setup/review, not a claim of model truth or production readiness.

- Ollama official release: https://github.com/ollama/ollama/releases — observed 0.34.0 archive/checksum; exact binary runtime verified separately. Main repository/license: https://github.com/ollama/ollama (MIT). Pinned LICENSE URL retrieval was unavailable; no fabricated pinned-license fetch result.
- API protocol: https://github.com/ollama/ollama/blob/main/docs/api.md — nonstreaming generation, options, duration/token metadata. App parses only needed transport fields and fixes budgets.
- Local-only configuration: https://github.com/ollama/ollama/blob/main/docs/faq.mdx and https://github.com/ollama/ollama/blob/main/envconfig/config.go — OLLAMA_NO_CLOUD and loopback binding.
- Candidate tags/licenses: https://ollama.com/library/qwen3:0.6b-q4_K_M and https://ollama.com/library/qwen3:1.7b-q4_K_M — Apache-2.0, quantization/tag. Actual installed full manifest digests are verified in phase6-model-manifest.json.
- Advisory data: https://github.com/advisories/GHSA-x8qc-fggm-mpqg and https://github.com/advisories/GHSA-r4wp-gg33-whwg; maintainer report https://github.com/ollama/ollama/issues/17041. Empty maintainer advisory lists do not establish absence of vulnerabilities.

No model performance/accuracy claim is imported from a model card. CPU pilot timings, errors, example outputs and known hallucination observations come from actual local runs. Desktop hardware and approved 8B candidate remain untested.
