# Phase 13 — Skills and authenticated MCP transport

Base: PR #4 reviewed by the user, current-head CI 37854227994 successful, merged with two-parent commit 95caf7486c0380a22bebe5c2c55a24419fcdf239. Branch: feat/m3-skills-http.

Scope: repo-contained Agent Skills-format opsledger-triage, progressive context loading, reusable triage_snapshot MCP prompt, bounded QA agent consumption of actual MCP, and a local-only authenticated Streamable HTTP learning profile. Official SDK server/client/core remain 2.3.1; the separately versioned official Node adapter is pinned to 2.1.1 (published peer requirement server ^2.3.0). No framework, public endpoint, OAuth authorization server, product UI/API/private incident adapter, operational tool or Phase 14 implementation.

The skill has name/description frontmatter and one explicitly referenced triage checklist. Engineering review pins both files' SHA-256; metadata enters the context first, body only for selected triage, reference only when selected. Altered content/permission-bearing metadata is denied by the reviewed profile before inference. This profile intentionally accepts one exact reviewed skill and a narrow frontmatter subset, not arbitrary YAML or arbitrary uploaded skills. It is a repository lab artifact, not an installed personal ChatGPT skill.

MCP prompt retrieval is checked against reviewed exact text; its description grants no authority. The Phase 11 controller accepts a reviewed async reader, validates tool/ID before any RPC, compares returned bytes/hash/untrusted marker against its copied approved snapshot and owns deadlines/coverage/budgets. Procedure text enters a separate untrusted bounded field and cannot skip required reads or turn model text into a CI verdict. Default direct prompts stay unchanged when no procedure is supplied. TCP/stdio readers have no operational writes.

HTTP uses the official web handler and Node adapter, only 127.0.0.1 with an ephemeral port. Exact Host/Origin (when Origin is present), audience, qa:read scope, expiry, revocation, bounded request body, request-ID replay cache and capacity limits are deterministic. Trusted in-process operator mints random opaque expiring grants; no token issuance route. Default lifetime 60 s; desktop bundle explicitly uses one 30 min session grant. Bearer is reusable: replay denial covers duplicate request IDs; a stolen token plus fresh nonce remains possible until expiry/revocation. This is not DPoP/OAuth AS/TLS production infrastructure.

JS guard allows only owned active loopback HTTP ports and, in the desktop script, the pinned local Ollama port. Ports are deregistered on close. Remote HTTP/HTTPS/DNS/socket attempts are denied through patched JS surfaces. Stdio children explicitly retain their stricter no-network guard. None of these process guards is an OS/native/child-process sandbox. All executables are reviewed trusted local code with normal OS permissions.

Work validation: lint/typecheck/build, 48 inherited units, six Phase 12 real-process protocol tests, seven new M3 integration suites and dependency audit pass. New tests cover actual stdio+HTTP bounded-agent reads, modern/legacy HTTP parity, unlisted resources, progressive loading, malicious skill/reference/prompt/resource, early-finish/unknown-tool denial, reader deadline/cancellation, and 14 HTTP credential/security cases including raw Host header probing (fetch normalizes Host). Evidence: phase13-context-snapshot.json and phase13-http-security-matrix.json, synthetic only, no tokens. Full branch CI passed on 4510690a9f10da7b094641c5cc0c52c398094f25 in run 37859889444: both API/browser lanes green, 48 units, seven M3 suites, six MCP suites, eight agent fixtures, 114 inherited AI evals (zero unexpected egress), 82 native integrations (zero skips), local restore/pre-AI benchmark and all nine browser flows. See evidence/phase13-ci-receipt.json and https://github.com/garontherocks/opsledger/actions/runs/37859889444. Engineering DoD complete; closure commit is docs/evidence only and does not replace the exact tested code SHA.

Desktop bundle is prepared, not run in Work. Nine actual-provider agent runs rotate direct/stdio/HTTP order across three repetitions with identical reviewed procedure/sources; generation-call count varies with model decisions. Model/runtime remain pinned by existing config, no new model/prompt quality promotion. Completed bundle execution does not mean model quality passed. Private raw traces stay ignored; selected semantic review and consolidated learning belong to M3.

Engineering learning is accumulated in phase13-learning.md. M3 desktop/human Teach-Back remain pending; no learner answers, acceptance judgments or live quality results are invented. Stop before Phase 14.

Official sources checked 2026-10-08:
- https://agentskills.io/specification
- https://github.com/agentskills/agentskills/blob/main/docs/specification.mdx
- https://ts.sdk.modelcontextprotocol.io/v2/serving/authorization
- https://ts.sdk.modelcontextprotocol.io/v2/api/%40modelcontextprotocol/server/server/createMcpHandler.html
- https://ts.sdk.modelcontextprotocol.io/v2/protocol-versions
Installed declarations, npm peer metadata, actual protocol tests and full locked dependency audit are checked; version numbers across packages are not assumed to match.
