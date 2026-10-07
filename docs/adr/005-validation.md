# ADR 005: Explicit Contracts and Zod Compatibility
Status: Accepted after probe; final validation status in evidence.

Problem: TS types alone do not validate network data.
Decision: Zod 4.6.5, Fastify Zod provider 7.0.0, Swagger 9.9.1, OpenAPI 3.1. Strict explicit API DTOs, no generated DB shape used blindly as public API.
Alternatives: official TypeBox provider viable if this bridge fails; not needed merely for package popularity.
Consequences: output serializers expect output types; avoid transform/coercion ambiguity initially.
Validation: valid request/output, invalid input/output and OpenAPI checks in disposable probe.
