# WeaveOS components: current consumer contract

Source of product truth: [PRD V030-042](https://app.notion.com/p/3f12f5a9e64881c5bba7f251cc3b7697), [ADR V030-042](https://app.notion.com/p/3f12f5a9e64881b0b034d435922cae72). This file documents implementation interfaces, not a second product specification.

## Build and use

Run `npm run build:weaveos:library`. The private/unpublished `dist-library` contains ESM, types, scoped styles and attribution. Consume `@weaveos/ui` and `@weaveos/ui/styles.css` through your reviewed workspace/package setup. Wrap the surface in `WeaveTheme`; portals inherit its light/dark mode. React, Base UI, Motion and other declared peers remain external. No automatic product migration, npm publication or deployment occurs.

## DataTable

Pass only the current authorized page as `rows`, stable `rowKey`, and `columns` with key/header/cell. A column must explicitly declare number/time and sortable before normal sorting is offered; text never gets a normal sort button. `sort` and `onSortChange` are controlled. `hiddenColumns` only changes rendered columns; it never changes the query or grants permission. `selectedKeys` and `onSelectionChange` belong to the host; select-all means the currently supplied page, not all matching records.

`loading` retains the supplied page and disables row/sort actions. `error` presents an explicit failure and `onRetry` retries the host's failed request. `refreshRequired` blocks navigation/mutations until the host performs `onRefresh`, resets to page one and receives a new query context. Do not present a network timeout as proof that a write failed or committed.

## Pagination

Controlled props: page/pageSize/total, onPageChange, optional onPageSizeChange/pageSizeOptions and disabled. The host resets page to one when page size, filter or sort changes. Until the host supplies the confirmed page, displayed page does not change. Page links use a constant-size window, including deep page jumps; this is a UI complexity guarantee, not a database deep-pagination optimization.

## FilterManager

Controlled persisted `presets`, `appliedId`, fields, onApply, async onSave and optional async onDelete. Opening shows management first. Saving does not implicitly apply. A successful callback means persistence has been confirmed by the host; a rejection keeps the editor and displays the error. The host owns network cancellation/timeouts and identity changes. Dirty close/back asks before discard. Delete has a separate confirmation. One applied preset at a time; onApply(null) clears it.

Current field editor supports text, number and time comparisons. Text: eq/neq; number/time: eq/neq/gt/gte/lt/lte. Tree groups use operator and children; leaves use fieldId/operator/value. Numeric input remains an exact decimal string, never coerced to float by the library. Validation limits: three group levels, twenty conditions, 16KiB filter, 32KiB preset. Backend validation and authorization remain authoritative. Specialized Boolean/enum/reference pickers and production-field migration are later scope; do not silently treat them as unrestricted text.

The studio's synthetic rows and in-memory presets demonstrate component events. Applying a preset emits its tree to the host's page-one query. The studio is not a real API/data engine and its canned rows/total must not be interpreted as accurate filtered production results.

## Cost and verification

DataTable builds a hidden-key set in O(H), projects C columns in O(C), renders R supplied rows in O(R*C). Pagination uses O(1) additional work relative to total rows/pages. Filter traversal is bounded by twenty leaves/three levels plus field registry lookup and serialization size. Host-provided selection copy cost depends on that host's selected-key set. No entire dataset is allocated.

Exact code `155b6c5c24ab6e1057ae75ca27107ecc3696cf0a`: [CI37566438299](https://github.com/Hubujiu/arca-ui/actions/runs/37566438299) passed31 Chromium cases,16 pure-function tests,4 package tests, own-source lint, TypeScript and studio/library builds. ESM37.34kB/gzip10.08kB excludes external peers, styles and fonts; not a runtime-memory figure. Legacy aggregate lint is not claimed clean.

Current table/filter work supplements the previous13 spring-dialog/focus/navigation cases. Evidence excerpts under `docs/evidence/V030-042/phase-c` omit long encoded media lines explicitly; original job logs and screenshot artifacts remain linked. Original RED and test-measurement corrections are retained. Remaining: resizing/reordering, richer field widgets, form/workflow compositions, extended motion/performance checks and separately reviewed real consumer integration.

## Field input contracts
DecimalInput is controlled with value:string|null and onValueChange; it preserves decimal characters and trailing zeros without float conversion or client rounding. Clearing returns null; "0" remains string. NullableBooleanInput is controlled boolean|null with explicit unset/yes/no, and respects readOnly/disabled. Both accept label, hint, error, required, name and optional id with associated descriptions. Textarea forwards native textarea props with the fixed ReUI Base skin. Backend validation/precision/permissions remain the host responsibility. Field demo values are synthetic and not saved.

## Hints and waiting
Tooltip/TooltipTrigger/TooltipContent/TooltipProvider retain Base UI focus/hover/Escape and add project-owned role and shared describedby identity; content inherits WeaveTheme across Portal. Progress requires label and controlled finite value0..100 or null for indeterminate, and never simulates completion. Skeleton is decorative aria-hidden; host provides meaningful status. Reduced motion disables pulse/indeterminate movement. No backend task/progress API is implemented by these controls.
