# Root-owned C1 verification

- Baseline browser RED: run 37563317943, head 50b51d9. Existing 13 browser tests passed; 7 new tests failed against the callable empty workspace scaffold. No missing environment or dependency errors.
- First implementation: run 37564021114, head 2330906. 18 browser tests passed, 2 failed. Root inspected raw logs.
- Production defect: the screen-reader label selector also matched the Base UI checkbox root span, clipping its hit target. Restricted the selector to the label text span, preserving actual checkbox geometry.
- Test measurement defect: snapshot used innerText but assertion defaulted to textContent, producing different whitespace for identical table cells. Set useInnerText:true so both sides measure the same unchanged rendered content. Original test preserved next to this file; value comparison remains exact and no timeout/assertion removed.
- Pure pagination: 3 RED assertions plus one valid invalid-input control; 4 GREEN after implementation. Bounded page window is O(1) time/space with respect to total records. DataTable rendering is O(page rows × visible columns), never O(total rows).
- Filter model: Root added 7 tests before implementation. Initial stub failed the 5 valid-value contracts; negative controls passed. Subsequent 7 GREEN validates bounded AND/OR model, no numeric coercion, depth 3 / 20 leaves / 16KiB.

No product API integration, deployment, master/main merge, or npm publication is implied.
