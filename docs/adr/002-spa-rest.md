# ADR 002: React SPA and REST
Status: Accepted baseline.

Problem: internal operations UI and explicit API contracts.
Decision: React/Vite SPA, Fastify REST, same-origin production delivery and a dev proxy.
Alternatives: SSR adds unnecessary rendering/auth paths; GraphQL adds a new query contract.
Consequences: no SEO/SSR requirement; accessible loading/error state is explicit. OpenAPI from reviewed runtime schemas, plus independent outcomes.
Validation: schema/OpenAPI compatibility spike and later browser/API acceptance.
