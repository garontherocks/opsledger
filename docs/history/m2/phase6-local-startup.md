# Phase 6 local startup and reproduction

Use synthetic data only. Start the existing PostgreSQL/application lab first using README. The AI feature is off by default. No paid API credential is required.

Verify actual machine/GPU/VRAM/driver/disk before choosing the approved desktop Qwen3 8B Q4 candidate; personal hardware was not observed by this execution environment. CPU smoke results are not a desktop benchmark. Runtime used here: official Ollama 0.34.0; Linux archive SHA-256 cf95886728959aa09910bb34de5cca1cc5a8f68003b5597197d3f2c2d57c0804. Download/install instructions: https://github.com/ollama/ollama/releases/tag/v0.34.0. Runtime/weights are intentionally not in the source package.

Start a separate local runtime with IPv4 loopback and cloud disabled. PowerShell example:

```powershell
$env:OLLAMA_HOST = "127.0.0.1:11434"
$env:OLLAMA_NO_CLOUD = "1"
$env:OLLAMA_NUM_PARALLEL = "1"
$env:OLLAMA_MAX_LOADED_MODELS = "1"
ollama serve
```

Stop an existing tray/service instance before starting a separate lab daemon on the same port, or use another loopback port consistently. Check /api/version and runtime log for cloud-disabled state. Do not expose this unauthenticated daemon to a network or tunnel.

In another terminal pull an explicit local tag. For CPU reproduction:

```powershell
ollama pull qwen3:0.6b-q4_K_M
ollama pull qwen3:1.7b-q4_K_M
Invoke-RestMethod http://127.0.0.1:11434/api/tags
```

Copy the full digest of the chosen local GGUF model to OLLAMA_DIGEST, adding sha256: if the API returns bare hex. Do not use a shortened library ID. Configure .env: AI_ENABLED=true, LAB_MODE=true, nonproduction NODE_ENV, OLLAMA_URL=http://127.0.0.1:11434, exact allowlisted OLLAMA_MODEL and full OLLAMA_DIGEST. Restart API. Use the existing synthetic login and incident detail; choose Draft timeline summary. Normal 30-second deadline is configurable up to 120 seconds for explicitly slow CPU experiments.

Run `npm run ai:pilot` against the configured OLLAMA_URL after both smoke candidates are pulled. It performs exactly three repetitions per model/case and writes bounded synthetic outputs/metadata to phase6-live-pilot.json. Review results with phase6-review-worksheet.md; do not infer a quality pass from completed HTTP requests. Preserve a copy of prior evidence before rerunning.

`npm run ai:live-smoke` is the execution-environment Linux owned-process test. It expects the verified runtime extracted at .local/ollama-runtime/bin/ollama and model directory .local/ollama-models, starts its own port 11436 daemon and disposable SQL fixture, exercises actual inference/stop/restart, then closes them. It is not a Windows installer or native PostgreSQL acceptance test.

For deterministic regression use lint/typecheck/build/test:unit/test:integration/test:e2e. E2E defaults AI off except a specifically labeled fixture flow; no model download or live-model quality verdict is hidden in CI. This environment recovered official Chromium 141 build 1194 after the current driver download failed, with PW_CHROMIUM_EXECUTABLE pointing at .local/chromium-1194/chrome-linux/headless_shell. Match rendering environment for checked-in screenshot comparison; alternate browsers/platforms need reviewed expectations. Do not update visual baselines to conceal a regression.
