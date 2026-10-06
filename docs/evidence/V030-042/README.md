# V030-042 evidence

The initial Chromium run did not reach product assertions. Chromium failed at Linux socket creation (EPERM), including one explicitly approved escalation retry. This is an environment blocker, NOT behavioral RED. `browser-environment-blocked.log` retains the failure. No browser test is claimed passed.

Root wrote `tests/weaveos/studio.spec.ts` before implementation against the approved PRD/ADR. A runnable minimal scaffold was used; actual browser RED still requires a supported browser execution route. Do not weaken assertions or count launch errors as missing-feature evidence.
