# C4a Root-authored tab verification

Final c5bb30d77f73f5cd0b4e64922ca52f1d759d6f61 / run37584241800:46 Chromium,16 pure and4 package tests PASS, no failure/skip/flaky. Type, lint and both builds passed. Root inspected the actual desktop screenshot and delivered it on2026-10-07 at07:00 UTC.

Chronology is preserved:50d4808a five missing-control failures while old40 passed; d5aa0abf44 pass/1 axe failure (close buttons were forbidden tablist children);8eec3636 fixed semantics and45 passed, but Root visually found a horizontal layout error.57c589ad introduced independent geometry assertion, actual y455.296875<required501.296875 failed while old45 passed. Final CSS only explicitly stacks full-width tab strip/panel. No assertion deadline or accessibility rule was weakened. Close-control queries moved from the invalid tablist subtree to the same page button after the semantic correction.

Controls are outside the tablist, measured on resize/scroll, not every spring frame. Controlled value/removal means consumer rejection leaves state intact. Pinned items have no close control or redundant pinned text. Component demonstration only; no routing, business persistence, library publication or WeaveOS migration.

Decoded log excerpts omit long media encoding lines only; log-index records exact counts and original/excerpt hashes. Excerpts are not claimed byte-identical to raw logs. Original reports/traces remain at each exact CI run and Root-preserved downloaded artifacts.
