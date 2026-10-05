import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { editorialData, editorialChanges, EDITORIAL_COPY_FIELDS } from '../src/lib/editorial-storage.mjs';

test('grouped controls update the same native JSON field and preserve untouched/unknown draft copy', () => {
  const before = { public_email: 'old@example.com', editorial_copy: { model_services: 'Services relus', future_copy: 'Conserver' } };
  assert.equal(editorialData(before).model_services, 'Services relus');
  assert.equal(editorialData({ public_email: 'real@example.com', editorial_copy: { public_email: 'shadow@example.com' } }).public_email, 'real@example.com');
  assert.deepEqual(editorialChanges(before, { model_services: '', public_email: 'new@example.com' }), {
    public_email: 'new@example.com', editorial_copy: { model_services: '', future_copy: 'Conserver' },
  });
  assert.deepEqual(editorialChanges(before, { public_email: 'new@example.com' }), { public_email: 'new@example.com' });
  assert.deepEqual(editorialChanges(before, {}), {});
  assert.equal(Object.hasOwn(editorialData({ editorial_copy: {} }), 'model_services'), false, 'Reading does not persist defaults');
});

test('seed bounds native result columns and keeps every virtual control in one JSON value', async () => {
  const seed = JSON.parse(await readFile(new URL('../seed/seed.json', import.meta.url), 'utf8'));
  const fields = seed.collections.find(collection => collection.slug === 'site_content').fields;
  assert(fields.length <= 60, 'Native D1 reads add system/revision columns; 85 custom columns caused a real query failure');
  assert.equal(fields.find(field => field.slug === 'editorial_copy').type, 'json');
  assert.equal(fields.find(field => field.slug === 'editorial_copy').required, false, 'An additive migration must tolerate existing published NULL');
  const data = seed.content.site_content[0].data;
  for (const field of EDITORIAL_COPY_FIELDS) {
    assert(Object.hasOwn(data.editorial_copy, field.slug), field.slug);
    assert(!fields.some(native => native.slug === field.slug), `${field.slug} must remain a virtual JSON control`);
    assert(!Object.hasOwn(data, field.slug));
  }
});

test('structured copy rejects malformed/oversized values and preserves intentional optional clearing', async () => {
  const { EDITORIAL_COPY_DEFAULTS, editorialCopyProblem, EDITORIAL_COPY_MAX_BYTES } = await import('../src/lib/editorial-storage.mjs');
  const full = { ...EDITORIAL_COPY_DEFAULTS };
  assert.equal(editorialCopyProblem(full), null);
  assert.equal(editorialCopyProblem({ ...full, model_services: '', footer_valet_text: null }), null);
  assert.match(editorialCopyProblem({ ...full, model_services: ['bad'] }), /du texte/);
  assert.match(editorialCopyProblem({ ...full, model_quote_note: { bad: true } }), /du texte/);
  assert.match(editorialCopyProblem({ ...full, request_pending: 'x'.repeat(256) }), /255/);
  assert.match(editorialCopyProblem({ ...full, model_services: 'x'.repeat(5001) }), /5000/);
  assert.match(editorialCopyProblem({ ...full, unknown_future_value: 'é'.repeat(EDITORIAL_COPY_MAX_BYTES) }), /64 Ko/);
  assert.match(editorialCopyProblem([]), /structurée/);
  assert.match(editorialCopyProblem({}), /obligatoire/);
});
