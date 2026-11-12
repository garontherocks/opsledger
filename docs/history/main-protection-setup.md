# Main branch protection — configuration required

The audit observed main is unprotected. This specification is not evidence that protection is active. The available repository connector cannot write protection/ruleset settings.

Configure an active rule/ruleset targeting only main:

- Require a pull request before merging; retain merge-commit integration/history.
- Require `acceptance (api)` and `acceptance (browser)` from the M2 GitHub Actions workflow.
- Require the branch to be up to date before merging.
- Block force pushes and deletion of main.
- Enforce for administrators where available; no routine integration bypass.
- No second person's approval is required in this single-maintainer repo; recorded human milestone gates remain separate.

Verify active enforcement and exact check names after applying. If the private-repository plan prevents enforcement, record the restriction rather than claiming protection is active. Protection does not authorize M3.

## Observed outcome — 2026-10-08

User attempted manual ruleset creation. API reports main protected=false and rulesets returns 403: Upgrade to GitHub Pro or make this repository public to enable this feature. Repository remains private. Requested controls are not enforced; PR/check/merge-commit discipline is procedural. Do not claim active protection or bypass an existing rule. PR #2 documentation repair was merged at 73992b2643080e178dd5ae2f0f40e96396457b80.
