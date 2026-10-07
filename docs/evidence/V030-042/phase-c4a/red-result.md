# arca-ui C4a expected RED preserved
Head50d4808afeda570dcf686368598b6885d97c6ec3, run37581403893, job112661676138.
Exact job: https://github.com/Hubujiu/arca-ui/actions/runs/37581403893/job/112661676138

Terminal FAILURE due only to5new tests in tests/weaveos/workspace-tabs.spec.ts.
Old40browser tests allPASS; new5allFAIL;0SKIP,0flaky.
16pure-function and4package contract tests allPASS; lint/typecheck/showcase/library builds SUCCESS.

Original failure assertions preserved:
- line3 pinned-label/nonclosable test: getByRole('tablist',{name:'应用标签页'}).getByRole('tab',{name:'工作台',exact:true}), attribute expected“true”;5000ms, element not found
- line4 arrow/Home/End and disabled-tab navigation: locator.focus20s test timeout
- line5 refused controlled switch: locator.check20s test timeout
- line6 controlled removal: locator.click20s test timeout
- line7 dark panels/reduced motion: locator.click20s test timeout

Evidence:
- job-112661676138.log and original tool response: complete rawlog
- artifact/weaveos.json: original reporter with true assertions and all45identities
- failure-assertions-50d4808a.json: original5failure result objects
- browser-test-identities-50d4808a.json: all45cases
- workspace-tabs-tests-source.ts: exact-head original test source snapshot
- artifact/: all5error-context files,5failure screenshots/traces, old successful review screenshots and original report
- Original artifact11464213948 ZIP digest verified e4d80da2bef03b7c1fe8c5712918a5b7bd5d8911bf2d79a1af137b69ae01141f
- All5trace archives pass integrity checks

No diagnosis or implementation attempted. No workflow/repository mutation or merge.

