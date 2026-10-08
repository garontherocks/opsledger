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
