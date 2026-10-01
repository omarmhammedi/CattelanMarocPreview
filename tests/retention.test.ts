import assert from 'node:assert/strict';
import test from 'node:test';
import { purgeExpired, RETENTION_MS } from '../src/plugins/retention.ts';

test('deletes only entries older than three years', async () => {
  const now = Date.UTC(2029, 9, 1);
  const rows = new Map([['old', { createdAt: now - RETENTION_MS - 1 }], ['recent', { createdAt: now - RETENTION_MS + 60_000 }]]);
  const store = {
    async query({ where }: { where: { createdAt: { lt: number } } }) {
      return { items: [...rows].filter(([, value]) => value.createdAt < where.createdAt.lt).map(([id, data]) => ({ id, data })) };
    },
    async deleteMany(ids: string[]) { for (const id of ids) rows.delete(id); },
  };
  assert.equal(await purgeExpired(store as never, now), 1);
  assert.deepEqual([...rows.keys()], ['recent']);
  assert.equal(await purgeExpired(store as never, now), 0);
});
