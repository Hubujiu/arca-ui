# C4a implementation d5aa0abf: terminal FAILURE
Head d5aa0abf11485e71dc5da0c9433035b1dfab2e54.
Run37582513369, job112665175134.
Exact job https://github.com/Hubujiu/arca-ui/actions/runs/37582513369/job/112665175134

45browser tests:44PASS,1FAIL,0SKIP,0flaky.
Old40allPASS; new5workspace-tabs tests:4PASS,1FAIL.
16pure-function/4package contract tests allPASS.
Lint, typecheck andbothbuildsSUCCESS.

Only failure tests/weaveos/workspace-tabs.spec.ts:7:
workspace tabs have accessible dark panels and reduced-motion presentation.
Original assertion expect(axe violations).toEqual([]) received critical aria-required-children.
Original reported message: Element has children which are not allowed: button[aria-label].
Reported example button has aria-label关闭人事管理. No additional cause diagnosis made.

Full true failure objects:failure-assertions-d5aa0abf.json.
All45identities and original assertions:browser-test-identities-d5aa0abf.json.
artifact/weaveos.json is original reporter.
Failure screenshot/trace/error-context:
artifact/workspace-tabs-workspace-t-34066-reduced-motion-presentation-chromium/
Original full raw job log:job-112665175134.log.

Allartifact files preserved. Original artifact11465240783 ZIP SHA256 verified:
304d47398048fb0b2b28fd1bae764f2bf5fb0aa9fabbd064b82a50f60b84256d

Read-only observation and evidence collection. No edits, reruns or merge.

