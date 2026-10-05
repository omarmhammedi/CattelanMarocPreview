/** Validate the initial EmDash model plus the project's reference/media contracts. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateSeed } from 'emdash/seed';

const seed = JSON.parse(await readFile(new URL('../seed/seed.json', import.meta.url), 'utf8'));
const result = validateSeed(seed);
assert.equal(result.valid, true, result.errors.join('\n'));
assert.deepEqual(result.warnings, [], result.warnings.join('\n'));
const known = new Set();
let count = 0;
const images = new Set();
function walk(value, path) {
  if (typeof value === 'string' && value.startsWith('$ref:')) {
    assert(known.has(value.slice(5)), `${path}: unresolved or forward reference ${value}`);
  } else if (Array.isArray(value)) {
    value.forEach((v, index) => walk(v, `${path}[${index}]`));
  } else if (value && typeof value === 'object') {
    if ('$media' in value) {
      assert.match(value.$media.url, /^https:\/\//, `${path}: media must have an HTTPS source`);
      assert(value.$media.alt, `${path}: image alternative text is required`);
      images.add(value.$media.url);
    }
    for (const [key, val] of Object.entries(value)) walk(val, `${path}.${key}`);
  }
}
for (const [collection, entries] of Object.entries(seed.content)) {
  const definition = seed.collections.find((item) => item.slug === collection);
  assert(definition, `Missing collection ${collection}`);
  const fields = new Set(definition.fields.map((item) => item.slug));
  for (const item of entries) {
    assert(!known.has(item.id), `Duplicate seed ID ${item.id}`);
    for (const key of Object.keys(item.data)) assert(fields.has(key), `${collection}.${key}: undeclared field`);
    walk(item.data, `${collection}.${item.id}`);
    known.add(item.id);
    count += 1;
  }
}
assert.equal(seed.content.pages.length, 12);
const privacy = seed.content.pages.find(page => page.slug === 'confidentialite');
assert.equal(privacy?.status, 'draft', 'New privacy content requires explicit review and publication');
assert(privacy.data.content.some(block => block.children?.some(span => span.text?.includes('{{retention}}'))), 'Privacy retains its dynamic retention fact');
const routeKeys = seed.collections.find((item) => item.slug === 'pages').fields.find((field) => field.slug === 'route_key').validation.options;
for (const page of seed.content.pages) assert(routeKeys.includes(page.data.route_key), `${page.slug}: unknown route key`);
assert.equal(seed.content.families.length, 8);
assert.equal(seed.content.posts.length, 5);
assert.equal(seed.content.site_content.length, 1, 'Only one global configuration is supported');
assert(!seed.collections.find((item) => item.slug === 'posts').fields.some((field) => field.slug === 'category'), 'Journal rubrics must use the native taxonomy only');
for (const post of seed.content.posts) {
  assert(!('category' in post.data), 'Do not duplicate native taxonomy labels in article data');
  assert(post.taxonomies?.category?.length, `${post.slug}: missing native category assignment`);
  assert(post.bylines?.length, `${post.slug}: missing editorial credit`);
  assert(post.data.content.length > 5, `${post.slug}: missing complete article`);
  assert(post.data.content.some((block) => block.style === 'h2'), `${post.slug}: missing article sections`);
}
// Native public reads include system and revision columns in addition to custom fields.
// The former 85-field global exceeded D1's result-column budget in the native query.
// Keep a conservative 60-field ceiling; grouped business text lives in one JSON field.
const sharedFields = seed.collections.find(collection => collection.slug === 'site_content').fields;
assert(sharedFields.length <= 60, 'site_content must stay within the D1 public-query column budget; put editorial text in editorial_copy');
assert.equal(sharedFields.find(field => field.slug === 'editorial_copy')?.type, 'json');
const discover = seed.collections.find((item) => item.slug === 'site_content').fields.find((field) => field.slug === 'discover_label');
assert(discover?.required && discover.type === 'string', 'Collection action needs its own required CMS string');
assert.equal(seed.content.site_content[0].data.discover_label, 'Découvrir');
assert.notEqual(seed.content.site_content[0].data.discover_label, seed.content.site_content[0].data.read_article_label);
const catalogue = seed.content.catalogues[0].data;
assert.equal(catalogue.is_placeholder, true);
assert.equal(catalogue.private_file_key, 'catalogues/cattelan-demonstration.pdf');
assert(!('file' in catalogue), 'Private catalogue must not be an EmDash public media file');
console.log(`EmDash seed valid: ${seed.collections.length} collections, ${count} entries, ${images.size} source images.`);
console.log('References resolve in application order; five complete articles and one private demonstration PDF are present.');
