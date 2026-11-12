# Phase 12 learning — accumulated for M3

MCP standardizes tool/resource discovery and request/result exchange; it does not grant authorization or make a server safe. OpsLedger reuses the existing registry so changing transport does not change opaque IDs, source integrity or executable authority. Tool annotations are hints; schemas and executor allowlists enforce policy.

Follow evidence/phase12-protocol-transcript.json: initialize → initialized notification → tools/list → malformed line → tools/call → validated result. This is actual legacy wire traffic. The official v2 SDK also negotiates modern 2026-07-28 via server/discover in the separate tested lane. SDK version and protocol revision are different concepts; never infer wire behavior from package major version.

Tools return approved content on request; resources identify immutable versioned evidence. Resource URIs do not grant filesystem access. Text and structured content are both untrusted and must agree with the approved snapshot. A valid hash/citation still cannot prove semantic truth.

Controlled failures: unknown shell tool, extra path argument, foreign source ID, stale resource hash and forged output are denied; timeout/AbortSignal reaches the cooperative slow server; closing the host closes its child. Malformed protocol input does not turn diagnostics into stdout data. Cancellation ends a request; it does not promise rollback of arbitrary external actions.

For the consolidated M3 checkpoint: explain the host/client/server/transport/executor separation; compare direct and MCP authority; explain versioned resources and protocol negotiation; defend stdout/stderr separation; distinguish cooperative cancellation and process egress guards from OS sandboxing. No learner answers or separate phase checkpoint are assumed.
