# ADR 008 — Local, read-only draft assistance with CPU smoke candidates

Status: implemented Phase 6 experiment; quality/human review and desktop benchmark pending.

Keep the approved Ollama provider boundary. Runtime 0.34.0 was downloaded from its official pinned release, SHA-256 verified, extracted privately and run on IPv4 loopback with OLLAMA_NO_CLOUD=1. No system service or public listener was installed. Runtime and model weights stay outside source/delivery; operator setup is explicit.

The execution environment has no observed GPU, shared AMD EPYC CPU and an 8 GiB cgroup limit (host reports about 10 GiB). Downloading the planned 8B/14B/9B GPU candidates and claiming desktop performance would not establish the intended experiment. Use Qwen3 0.6B and 1.7B Q4_K_M for actual local transport/summary/failure experiments now; retain the approved 8B desktop baseline as an unexecuted candidate. This is a measured small-candidate adaptation, not a selection of a production model or new provider. Full installed manifest hashes are frozen in evidence.

Use Node fetch directly; no SDK/framework dependency is needed for bounded plain-text generation. A generated-text transport envelope carries model/runtime/hash/usage/revision evidence; it is not a model JSON-schema/semantic-validity mechanism. One inference at a time, finite input/output/deadline, fixed paths, local-only model allowlist, no redirects and explicit local GGUF/digest verification. Application requests cannot pull/delete/push models or provide URLs/prompts/model choices.

An incident summary samples at most the latest 20 events in a consistent read-only DB transaction. Release the SQL client before inference; recheck active caller membership and current revision afterward. No state transition, comment, knowledge publication, draft acceptance or generated command execution is available through this feature. The draft is unverified text rendered literally. Operator-controlled logs record metadata/hashes, not raw prompts/output; bounded synthetic pilot output is explicitly exported for review.

Actual pilot results include malformed citation identity, unsupported progress/repair claims and poor change-risk usefulness. Larger parameter count did not establish correctness. Keep AI off by default, require human review, and do not score this as a safety/quality pass. Native M1/remote CI gates remain pending; the user explicitly authorized Phase 6 progression with those disclosed debts. Phase 7 is not authorized here.
