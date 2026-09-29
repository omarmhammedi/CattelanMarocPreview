/** Publish the six approved family guides through the guarded native editorial engine. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runEditorialMigration, validateEditorialManifest } from './0004-collection-editorial.mjs';

const manifest = validateEditorialManifest(JSON.parse(await readFile(new URL('../../content/family-guides.json', import.meta.url), 'utf8')));
assert.equal(manifest.collection, 'families');
assert.deepEqual(manifest.entries.map(entry => entry.slug).sort(), ['tables', 'chaises-tabourets', 'canapes-fauteuils', 'buffets-bibliotheques', 'luminaires', 'mobilier-exterieur'].sort(), 'Only the six existing family guides may change.');
await runEditorialMigration({ manifestFiles: ['family-guides.json'], expectedCollections: ['families'], migrationId: '0008-family-guides' });
