# arca-ui geometry regression: expected RED
Head57c589ad3bb6923580958d36140d649005cb5c65, run37583767941, job112669135814.
Exact job https://github.com/Hubujiu/arca-ui/actions/runs/37583767941/job/112669135814
Terminal FAILURE:45PASS,1FAIL,0SKIP,0flaky. Allprevious45passed.
16pure/4package testsPASS; lint/typecheck/bothbuildsSUCCESS.

Only new geometry test tests/weaveos/workspace-tabs.spec.ts:8:
workspace content starts below a full-width horizontal tab strip.
Actual assertion toBeGreaterThanOrEqual expected>=501.296875, received455.296875.
Do not treat this as visual/layout acceptance. Subsequent assertions in that same test were not reached after this failure.

failure-assertions-57c589ad.json preserves exact original failure objects.
browser-test-identities-57c589ad.json preserves all46cases.
workspace-tabs-tests-source.ts is an exact-head snapshot of all original assertions.
artifact/workspace-tabs-workspace-c-4c681--width-horizontal-tab-strip-chromium/ preserves failure screenshot,trace,error-context.
artifact/weaveos.json preserves unmodified original reporter.
job-112669135814.log and original response JSON preserve complete rawlog.
Artifact11466275662 digest matched:
927df084eb15de0a78f4ae1100d011e48ad431a03a1a849ab7aef529df88dd95

No diagnosis,CSSchange,rerun ormerge performed.

