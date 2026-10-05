import assert from 'node:assert/strict';
import { nativeSeoChange } from '../scripts/migrations/0026-native-seo-authority.mjs';

/** Historical manifests keep their approved copy and original field names.
 * Their current-frontend browser suites expect the same copy AFTER the native
 * SEO cutover, not a frontend fallback to archived custom fields. */
export function nativeSeoForFixture(data, seo = {}) {
  const result = nativeSeoChange({ status: 'published', draftRevisionId: null,
    liveRevisionId: 'historical-published-fixture', data, seo });
  assert(!result.blocker, `Invalid SEO fixture: ${result.blocker}`);
  return { ...seo, ...result.changes };
}
