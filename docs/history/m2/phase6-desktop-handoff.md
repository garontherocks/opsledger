# Phase 6 desktop handoff — Windows / PowerShell

Phase 7 remains stopped. Desktop setup, actual 8B generation, provider failure/recovery, 36-generation model comparison and grouped human review were performed by Víctor on 2026-10-08. See [desktop closure](phase6-desktop-closure.md) for decisions, checkpoint coverage and remaining release limitations. Version pinning establishes comparable identity, not guaranteed byte-identical output across hardware.

## Restore full history and publish from your desktop

The supplied `OpsLedger-Phase6-GitHub-Handoff.zip` contains a complete Git bundle. Extract it. Git/GitHub authentication must be available on your own machine (Git Credential Manager may open the browser). The GitHub plugin used here cannot import original commit metadata/history, and this execution environment lacks authenticated Git transport. Nothing has been pushed by this handoff. Do not paste GitHub tokens into chat.

```powershell
git clone --branch feat/local-ai-assistance .\opsledger-phase6-handoff.bundle opsledger
cd opsledger
git remote set-url origin https://github.com/garontherocks/opsledger.git
git fetch origin
git branch -a
git log -1 --format=%H
```

For every historical branch, create its local branch from the recovered origin ref BEFORE refreshing origin remote tracking refs. A bundle clone retains these refs until the new empty remote fetch; verify them using `git branch -r`. The archive includes `publish-phase6.ps1` which performs this restoration, verifies the expected handoff SHA and checks remote emptiness before pushing explicit branches and tags. Run it from the extracted directory instead of manually executing the clone above:

```powershell
.\publish-phase6.ps1
```

The script never uses force, mirror, squash, merge or main. GitHub may pick the first pushed existing branch as default; always checkout feat/local-ai-assistance explicitly. Stop if the remote is no longer empty. Existing full history comprises seven branches and eighteen commits before the documentation/ignore handoff commit, with no tags.

Once uploaded, normal desktop clone:

```powershell
git clone --branch feat/local-ai-assistance https://github.com/garontherocks/opsledger.git
cd opsledger
git log -1 --format=%H
npm ci --ignore-scripts
```

## Start conventional app first

Install Node 24.19.x/npm 11, Git and Docker Desktop with Linux containers. Follow README Native local startup: create .env locally, choose separate random DB/auth secrets, and an absolute private STORAGE_DIR outside the repository (for example C:/OpsLedger-private/files). Configure DB_PASSWORD in your PowerShell session to match .env, start PostgreSQL via Docker Compose, migrate twice, seed, build, start API and separate worker with --env-file=.env. Password changes do not reset an existing PostgreSQL volume. Do not delete a volume to resolve a startup error. Keep AI_ENABLED=false until ordinary incident workflows pass. Generated credentials are private; never upload them.

## Verify desktop model and review

Record actual `nvidia-smi` GPU/VRAM/driver and available memory/disk; historical hardware information is not a measurement of this run. Follow phase6-local-startup.md to run a separate loopback/cloud-disabled Ollama instance, record /api/version and exact model manifest digest, then enable lab-only AI. The approved desktop candidate is `qwen3:8b-q4_K_M`; install and measure only after actual hardware verification. No automatic model upgrade is assumed.

The existing ai:pilot script compares ONLY the two 0.6B/1.7B CPU candidates; changing OLLAMA_MODEL does not make that script benchmark 8B. Compare desktop 8B manually on the same four versioned fixtures with three repetitions, recording full model/runtime identity, prompt/context settings, latency and accept/edit/reject reasons. Preserve original evidence and keep private desktop records in ignored evidence/desktop-private until reviewed for publication. Do not claim a matched comparison if conditions differ.

Use the actual app for a draft, then stop only the owned lab Ollama instance: summary should fail safely while incident reads work and revision remains unchanged. Restart and retry deliberately. The ai:live-smoke script is Linux execution-environment-specific, not a Windows installation tool. Review all generated claims and IDs against source events using phase6-review-worksheet.md. Continue remaining teach-back steps with assistance, without invented learner answers. Do not start Phase 7 or mark Phase 6 fully complete until outstanding criteria are demonstrated.

## Security and checks

.env variants, credentials, .local state, private keys, local DBs/backups, model weights/runtimes/browser binaries and dependencies/builds are ignored. Safe synthetic docs/evidence remain versioned. Ignoring paths does not remove earlier committed files; the complete pre-handoff history was inspected for excluded state, large blobs and selected credential patterns, with no findings. This is a bounded review, not a universal secret-detection guarantee. Largest historical blob is about 1.57 MB (synthetic v1 video).

Ignore changes were tested using git check-ignore. Documentation-only handoff preserves all product code from the validated commit; no new native/desktop/CI acceptance is claimed. The Linux screenshot baseline may differ on Windows/current Chromium: inspect differences before approving any new baseline, never auto-update it to hide regression.
