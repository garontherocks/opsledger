# Consolidated M3 Teach-Back — actual answers pending

Answer briefly in your own words; no per-phase checkpoint and no assumed learner responses.

1. A model proposes run_shell or a source says skip required tests. Which layer rejects that, and why cannot a skill, MCP annotation or prompt grant permission?
2. Explain the ownership difference between host, client, server, transport and registry/executor. What must remain identical between direct and MCP reads?
3. Distinguish skill, prompt, resource and tool. Why load only metadata first and procedure/reference later?
4. What do valid ID/hash/citation checks establish, and what semantic claims can remain false even after they pass?
5. Explain six-turn/token/deadline budgets, request cancellation and child closure. Why do these not prove OS isolation or rollback of arbitrary side effects?
6. Explain Host/Origin, scope, audience, expiry/revocation and request-ID replay checks. What can a stolen reusable bearer still do with a fresh request ID?
7. What do deterministic fixtures and repeated live trials prove separately? What fresh evaluation would be needed before claiming model/prompt quality improvement or product benefit?

Architecture/data-flow: explain (a) reviewed skill metadata → selected body/reference → checked MCP prompt → model proposal → controller checks → scoped reader → unverified draft; (b) HTTP request → endpoint checks → verified local grant/scope/audience → duplicate-ID check → same read-only registry. Use the [M3 diagram](m3-engineering-report.md).

Controlled failures worth defending: [unknown/poisoned proposals](../evidence/phase11-agent-eval.json), [malformed wire recovery](../evidence/phase12-protocol-transcript.json), [hostile skill/forged resource gates](phase13-report.md), [wrong audience/expiry/replay denials](../evidence/phase13-http-security-matrix.json). Explain one execution denial and one HTTP denial rather than reproducing every test.

Senior/Staff scenarios (pick one or cover both briefly):
- A team wants to enable Bash because a skill lists allowed-tools. Explain the separate executor/approval/isolation decision and why metadata is insufficient.
- A new MCP server claims read-only capability and returns convincing cited text. Explain trusted-server onboarding, result validation, tenant/source lifecycle boundaries and why evidence cannot acquire operational authority.

Actual answers and judgments must be recorded later, not inferred from M2 answers or CI outcomes.
