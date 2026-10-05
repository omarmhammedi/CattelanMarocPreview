# EmDash audit evidence

See [the audit](../../emdash-editability-audit-2026-10-04.md) for findings and limits.

- `routes.json`: 64 live public GET checks against routes from current source `e8baf896`.
- `browser.json`: three live browser observations; no attempted writes or page errors.
- `connections.json`: public site, login and native OAuth discovery results.
- `live-*.png`: current public desktop/mobile and unauthenticated login screenshots.
- `baseline-local-*.png`: authenticated disposable EmDash 0.41 with the earlier 99-field schema. These explain the native interface; they are not screenshots of the current live admin or its 102-field migrated schema. No customer data or credentials are present.

Source audit and migrations establish current field definitions. Current unit tests: 258 passed. Current schema validation: 6 collections, 65 seed entries, 1638 declared source-image references. The full live publication workflow was not tested.
