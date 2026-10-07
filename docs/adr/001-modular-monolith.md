# ADR 001: Modular Monolith
Status: Accepted baseline.

Problem: rich quality surfaces without excessive deployment complexity.
Decision: one repository/application with API and worker entry points and explicit domain modules.
Alternatives: microservices add network/data ownership costs; single unstructured module hides policies.
Consequences: transactions and shared deployment are simple; module boundaries need discipline. No generic repository/service hierarchy.
Validation: architecture review and later transaction/concurrency checks.
