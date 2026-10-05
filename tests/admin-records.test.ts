import assert from 'node:assert/strict';
import test from 'node:test';
import { matchesRecordSearch, mergeRecordPages, readRecordWindow } from '../src/plugins/admin-records.ts';

test('operations search handles accents and multiple terms literally', () => {
  assert.equal(matchesRecordSearch(' hôtel   rabat ', ['Hôtel privé', 'Rabat']), true);
  assert.equal(matchesRecordSearch('rabat hotel', ['Hôtel privé', 'Rabat']), true);
  assert.equal(matchesRecordSearch('hotel tanger', ['Hôtel privé', 'Rabat']), false);
  assert.equal(matchesRecordSearch('[', ['Salma']), false);
  assert.equal(matchesRecordSearch('', [null, undefined]), true);
});

test('overlapping pages update records without displaying duplicates', () => {
  assert.deepEqual(mergeRecordPages([{ requestId: '1', status: 'pending' }, { requestId: '2', status: 'pending' }], [{ requestId: '2', status: 'sent' }, { requestId: '3', status: 'sent' }]), [
    { requestId: '1', status: 'pending' }, { requestId: '2', status: 'sent' }, { requestId: '3', status: 'sent' },
  ]);
});

test('refresh after deleting a page boundary rebuilds cursors without losing following requests', async () => {
  let rows = ['1', '2', '3', '4', '5', '6', '7'];
  const read = async (cursor?: string) => {
    // Like native ordered plugin storage, a cursor needs its boundary row.
    if (cursor && !rows.includes(cursor)) throw new Error('Deleted cursor row');
    const start = cursor ? rows.indexOf(cursor) + 1 : 0;
    const ids = rows.slice(start, start + 2);
    const hasMore = start + ids.length < rows.length;
    return { items: ids.map(requestId => ({ requestId })), hasMore, ...(hasMore ? { cursor: ids.at(-1) } : {}) };
  };
  const before = await readRecordWindow(read, 4);
  assert.equal(before.cursor, '4');
  rows = rows.filter(id => id !== '4');
  await assert.rejects(() => read(before.cursor), /Deleted cursor/);
  const refreshed = await readRecordWindow(read, before.items.length - 1);
  const rest = await readRecordWindow(read, 1, refreshed.cursor);
  assert.deepEqual(mergeRecordPages(refreshed.items, rest.items).map(item => item.requestId), rows);
});

test('broken or repeated pagination stops visibly instead of looping or hiding missing rows', async () => {
  await assert.rejects(() => readRecordWindow(async () => ({ items: [], hasMore: true })), /pagination/);
  await assert.rejects(() => readRecordWindow(async () => ({ items: [{ requestId: '1' }], hasMore: true, cursor: 'same' }), 2), /pagination/);
});
