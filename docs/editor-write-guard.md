# Permanent page write protection

The first-party editorial plugin protects the `pages` and `site_content` route identities through native before-save, publish, schedule, delete and unpublish hooks. Draft content remains editable. Hook registration requires `content:read`, `content:write` and `hooks.content-policy:register` capabilities; omitting them can silently disable checks in EmDash 0.41.

EmDash 0.41 has two additional request shapes that bypass those lifecycle hooks:

- A generic content update containing only `slug` (without `data` or `references`) updates the live content row instead of staging a revision.
- A REST content update containing `status: "draft"` directly updates the status instead of invoking the dedicated unpublish action.

The application middleware rejects these shapes for `pages` and `site_content` after native authentication. For a deliberate slug draft, send `data: {}` with the update, then use the native publish action. Publication still refuses identities that do not match the fixed site route. For publication status, use the native dedicated action. Native editor saves already send `data` and `slug`; the native editor also uses the dedicated unpublish endpoint. SEO-only saves and other collections remain unaffected.

The same unsafe slug shape is rejected in the MCP `content_update` tool. MCP status transitions already invoke dedicated native actions and remain available. A JSON-RPC batch containing an unsafe protected update is rejected as a whole before any call executes; each request ID receives an error, and notifications receive no response body. Resubmit valid calls separately. Read tools, discovery, authentication and token scopes retain their native behavior.

This layer does not grant permissions, replace native validation or make a schema administrator unable to change the application. Duplicate drafts remain allowed. Direct database writes, schema changes and native permanent deletion outside the ordinary content lifecycle remain privileged maintenance operations. The tested public workflow uses drafts, preview and explicit publication.

Authenticated local integration on 5 October 2026 verified that a native `content_get` succeeds, a slug-only update returns HTTP 400 with JSON-RPC code `-32602` and the original request ID, and a mixed batch is rejected without changing the home record or revision. Anonymous requests and revoked tokens return 401; a valid token lacking `content:read` receives the native `INSUFFICIENT_SCOPE` tool error. Both temporary tokens were revoked. See the [sanitized MCP report](audits/editor-readiness-2026-10-05/mcp-write-guard.json) and [fixture instructions](testing-cms-fixtures.md). This verifies the isolated local runtime, not a live OAuth connection.
