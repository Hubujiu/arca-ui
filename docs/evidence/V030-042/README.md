# V030-042 evidence

The initial Chromium run did not reach product assertions. Chromium failed at Linux socket creation (EPERM), including one explicitly approved escalation retry. This is an environment blocker, NOT behavioral RED. `browser-environment-blocked.log` retains the failure. No browser test is claimed passed.

Root wrote `tests/weaveos/studio.spec.ts` before implementation against the approved PRD/ADR. A runnable minimal scaffold was used; actual browser RED still requires a supported browser execution route. Do not weaken assertions or count launch errors as missing-feature evidence.

Actual browser RED: GitHub Actions run 37431293338/job 112162522596, head 6907ed510ac76e433af5d5cee8fba33986d6d786. Browser installed and ran; ten tests failed on missing workspace/control elements in the minimal scaffold. Raw job output is browser-red-ci.log. Root read this before implementing the studio.
Geometry: five independent unit cases, actual two failed/three passed on null stub, then five passed after implementation; original stub and exact logs retained.
Legacy repository build passed. Existing aggregate lint reports 408 errors /29 warnings before studio implementation; baseline-lint.log preserves this debt, it is not silently fixed or claimed green.

Further verification authored after the first implementation: origin-motion.spec.ts samples real browser geometry for closing and reopening. These are additional acceptance tests, not represented as the original pre-implementation RED. Library export/config scaffolding was also prepared before independent packaging tests; no packaging TDD chronology or passed consumer build is claimed yet. Browser execution remains pending authorized resynchronization after the canceled connector call.
