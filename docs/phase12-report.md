# Phase 12 — MCP fundamentals over stdio

Phase 11 was merged through PR #3 with merge commit b0b785a922288a831fe28266c4d2bb27462b6e5a after current-head CI run 37852650916 passed both API/browser lanes. Phase 12 is isolated on feat/mcp-stdio above that main commit.

Scope: the official TypeScript SDK server/client pinned to 2.3.1 exposes the existing approved synthetic registry through stdio. Three tools retain the same opaque IDs, schema/integrity checks and source bytes. Three immutable resource URIs encode qa-readonly-v1, source ID and SHA-256. No private incident/runbook adapter is useful yet: this learning profile intentionally uses the same synthetic evidence as Phase 11. No DB/API/UI changes, operational tool, shell runner, arbitrary URL/file reader, model adoption, HTTP deployment, skill or Phase 13 implementation.

Real integration: connectOwnedQa is a local host that owns one allowlisted absolute Node executable and fixed repository server script. It discovers the three tool names, calls tools through the SDK and validates output schema, ID, exact approved text, hash, untrusted marker and text/structured-content agreement. Resources are exact registered URIs, not path templates. Metadata/readOnlyHint is descriptive; executor policy and approved registry scope enforce restrictions. The host closes its transport/owned process.

Compatibility: SDK 2.3.1 is distinct from protocol revision. The server uses serveStdio with one factory for modern 2026-07-28 and legacy 2025-11-25 openings. The owned host pins modern by default; the legacy lane is explicit. All three tools and resources match direct registry outputs in both lanes. No general third-party host compatibility is claimed. The checked-in raw transcript is a real legacy initialize exchange, not fabricated modern server/discover traffic. Modern negotiation is exercised by the official SDK client and its observed getProtocolEra result.

Work checks: six process/protocol tests pass with zero skips, covering both compatibility lanes, complete direct parity, exact resource versions, unknown tools, malformed/extra arguments, foreign IDs, unlisted/stale resource URIs, forged output/content, timeout and explicit cancellation with server-side confirmation in both eras, process closure, HTTP/socket egress denial and malformed-line recovery with clean JSON stdout. Lint/typecheck/build and audit pass; no known moderate vulnerabilities. Existing 48 unit tests and required M2/native/browser regression remain unconditional. Branch CI is the remaining engineering gate before integration; exact receipts will be added after observed completion.

Actual transcript: evidence/phase12-protocol-transcript.json contains synthetic source text only, direction labels and actual JSON-RPC messages. Diagnostics remain stderr; protocol errors do not log payloads. No learner answers, human judgments or live-model results are inferred. Sources with valid hashes/URIs remain semantically untrusted.

The stdio JS process guard denies fetch, standard HTTP/HTTPS, DNS lookup and socket connects in the parent test host and explicitly imported owned children, including loopback. It is not an OS/native/child-process sandbox. These are reviewed local processes with normal user OS permissions, not safe launchers for untrusted arbitrary servers. No credentials/.env/DB/Ollama configuration are loaded by the lab server. Fixed source files must be reviewed and controlled by the operator.

Timeout/cancellation are demonstrated with a cooperative test-only slow server outside the production allowlist; ordinary registry reads are immediate. Cancellation does not prove rollback or safe interruption of arbitrary external actions. Registered test execution remains absent and mandatory CI stays outside model control. Final model drafts remain unverified under M2 policy.

Learning is accumulated in phase12-learning.md; no new desktop or human checkpoint is requested. The integrated M3 bundle may inspect the same locally reproducible protocol path; no live local-model dependency was introduced. Phase 13 is not started. Main protection remains the documented GitHub private-plan limitation.

Official sources checked 2026-10-08:
- https://github.com/modelcontextprotocol/typescript-sdk/blob/main/README.md
- https://ts.sdk.modelcontextprotocol.io/v2/get-started/first-client
- https://ts.sdk.modelcontextprotocol.io/v2/protocol-versions
- https://ts.sdk.modelcontextprotocol.io/v2/migration/support-2026-07-28
- https://ts.sdk.modelcontextprotocol.io/v2/serving/legacy-clients
Installed package declarations and actual wire output are checked alongside documentation; no latest-version behavior is assumed from an SDK name.
