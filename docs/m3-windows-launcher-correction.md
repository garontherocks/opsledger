# M3 Windows stdio launcher correction

## Actual failure

The user ran npm run ai:m3-desktop on Windows / Node 24.19.0 at 544f22edf55c4abd806751e693162d936c0aa7e0. All nine agent runs were prevented by startup failure. The same guard import independently failed as a Windows filesystem argument with ERR_UNSUPPORTED_ESM_URL_SCHEME and succeeded as a file URL. [Original failed attempt](../evidence/m3-windows-startup-failure.json) is preserved. This is engineering/platform evidence, not model/provider/MCP quality evidence.

## Implementation and review

All child-process --import sites in scripts/tests were searched. The production host, cancellation fixture and raw JSON-RPC probe now preserve reviewed file URLs through nodeImportSpecifier. The Node entry script is still passed as a filesystem filename. Existing npm entry points use relative ./ ESM specifiers and were not affected. No dependency or lockfile, model/runtime pin, protocol pin or skill digest changed.

Node's official [ESM URL rules](https://nodejs.org/docs/latest-v24.x/api/esm.html#urls) resolve imports as URLs; [URL conversion rules](https://nodejs.org/docs/latest-v24.x/api/url.html#urlpathtofileurlpath-options) distinguish file URLs from platform paths. The implementation starts from fixed new URL(relative, import.meta.url) values, so no platform path-to-URL reconstruction is needed.

Stdio capture is bounded to 8,000 characters. Public diagnostics retain only recognized error codes and the known Windows file-URL explanation; unknown text, private paths, source lines and credentials are withheld. The original SDK failure is retained as Error.cause, and transport cleanup runs before reporting. SDK 2.3.1's negotiation sibling intentionally discards stderr. When no session stderr is available, a single diagnostic startup probe runs the exact same reviewed guarded Node command, stdin closed, timeout 1.5 seconds, output bound 8 KiB. Its summary is explicitly labeled diagnostic startup probe; it is not evidence that the original sibling's stderr was captured. It does not reconnect, fall back to legacy or continue the bundle. Unknown/protocol-specific failures may still have no recognized child diagnostic code.

Security review: executable remains process.execPath; fixed guard/server URLs only; shell disabled; safe SDK default environment only; original guard loaded before server; no model-selected executable, command, path, endpoint or permission. Probe runs only after failure and cannot create operational authority. Existing JavaScript guard limits remain documented; this is not an OS/native subprocess sandbox.

Regression coverage: Windows drive/UNC and escaped POSIX specifier preservation; rejected non-file/query/fragment URLs; real missing-preloader child failure with safe diagnostic code, original cause and child cleanup; actual modern/legacy stdio launch, cancellation and raw JSON-RPC; integrated MCP agent and HTTP security gates. A new Windows 2025 / Node 24.19.0 CI lane runs the real MCP and M3 suites; full Linux API/browser CI is unchanged. No live model call is part of these deterministic checks.

## Acceptance

Corrective code commit: cf4c6f0c2a97bcc494eaeb2b2d5a39dcc16ea1d2. Full corrective CI run 37867155568 passed all three lanes; [actual receipt](../evidence/m3-windows-correction-ci-receipt.json). Windows: 8 MCP and 7 M3 tests, no failures/skips. Linux: 48 units, 82 native integrations without skips, 114 AI regressions with zero unexpected egress, 8 agent fixtures, 9 browser flows, lint/types/build/audit and restore/baseline passed. Local lint/types/build/audit, 48 unit tests, 8 MCP tests and 7 M3 tests passed. The initial diagnostic regression exposed SDK sibling stderr suppression and was corrected before this commit; it is not a successful desktop result.

Desktop rerun and human M3 checkpoint remain pending. Preserve the approved M2 runtime/model configuration and run one desktop bundle at the supplied final handoff. No Phase 14/M4 or PR merge authorized.
