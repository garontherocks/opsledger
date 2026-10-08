# Phase 11 learning — accumulated for M3

Read the valid-order synthetic trace in evidence/phase11-agent-eval.json: controller checks the manifest → model proposes read_change_snapshot → strict schema/scope validation → registry returns untrusted data → model requests contract/evidence → controller checks required coverage → final analysis remains unverified.

The direct registry separates a tool's declared schema from its executor. A model name/argument proposal is not authority. The controller owns the allowlist, approved source IDs, snapshots, policy, budgets, mandatory checks and stop conditions. No framework or MCP is needed to understand this boundary.

Controlled failures: unknown shell/path arguments execute nothing; poison-driven close_incident is denied; skipping required reads blocks finish; repeated valid reads stop after six calls; a late model response after deadline cannot execute a tool. A source with a valid hash can still be malicious or false. Hash integrity proves bytes, not semantics. Synthetic evidence does not prove real CI.

For the consolidated M3 checkpoint: explain model decision versus executor authority; map the registry's eventual transport adapter without duplicating authorization; explain logical timeout versus cancellation/resource containment; defend why mandatory CI cannot be delegated to a model; compare this small harness with Codex's broader tool/policy environment without asserting identical capabilities.

No learner answers are assumed and no phase-level checkpoint is required. Actual model selection quality remains for the one M3 desktop bundle and calibrated evals.
