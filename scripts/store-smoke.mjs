// Smoke test for src/lib/store.ts persistence.
// Compiled with tsc, executed in Node with fake-indexeddb providing IDB.
// Run: npm run test:store
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';

const store = await import('../node_modules/.tmp/store/store.js');

const show = (id, name) => ({ id, name, premiered: '2008-01-20', image: null });

// --- episode cache round-trip ---
await store.setCachedEpisodes(169, [{ id: 1, name: 'Pilot', season: 1 }]);
assert.deepEqual(await store.getCachedEpisodes(169), [{ id: 1, name: 'Pilot', season: 1 }]);
assert.equal(await store.getCachedEpisodes(999), undefined);
console.log('ok - episode cache round-trip');

// --- watched ids ---
assert.deepEqual(await store.addWatchedId(169, 1), [1]);
assert.deepEqual(await store.addWatchedId(169, 2), [1, 2]);
assert.deepEqual(await store.addWatchedId(169, 1), [1, 2]); // dedupe
assert.deepEqual(await store.removeWatchedId(169, 1), [2]);
await store.clearWatched(169);
assert.deepEqual(await store.getWatchedIds(169), []);
console.log('ok - watched ids');

// --- recent shows: order + dedupe + re-visit moves to front ---
await store.addRecentShow(show(1, 'A'));
await store.addRecentShow(show(2, 'B'));
await store.addRecentShow(show(1, 'A'));
assert.deepEqual((await store.getRecentShows()).map((s) => s.id), [1, 2]);
console.log('ok - recent shows');

// --- recent watches ---
await store.addRecentWatch({ episodeId: 10, code: 'S01E01', episodeName: 'Pilot', show: show(1, 'A'), at: 1 });
await store.addRecentWatch({ episodeId: 11, code: 'S01E02', episodeName: 'Cat', show: show(2, 'B'), at: 2 });
await store.addRecentWatch({ episodeId: 10, code: 'S01E01', episodeName: 'Pilot', show: show(1, 'A'), at: 3 });
assert.deepEqual((await store.getRecentWatches()).map((w) => w.episodeId), [10, 11]);
console.log('ok - recent watches');

// --- last show ---
await store.setLastShow(show(2, 'B'));
assert.equal((await store.getLastShow()).id, 2);
console.log('ok - last show');

// --- merge: watch-derived shows always listed (reported bug scenario) ---
// viewed=[Mentalist], watches=[B99, Mentalist, B99] -> [Mentalist, B99]
const mentalist = show(5, 'The Mentalist');
const b99 = show(6, 'Brooklyn Nine-Nine');
const watches = [
  { episodeId: 21, code: 'S01E22', episodeName: 'Charges and Specs', show: b99, at: 3 },
  { episodeId: 22, code: 'S02E06', episodeName: 'Black Gold and Red Blood', show: mentalist, at: 2 },
  { episodeId: 23, code: 'S02E18', episodeName: 'Captain Peralta', show: b99, at: 1 }
];
assert.deepEqual(
  store.mergeRecentShows([mentalist], watches).map((s) => s.id),
  [5, 6]
);
// already-listed shows are not duplicated
assert.deepEqual(
  store.mergeRecentShows([b99, mentalist], watches).map((s) => s.id),
  [6, 5]
);
// empty viewed list still recovers shows from watches
assert.deepEqual(
  store.mergeRecentShows([], watches).map((s) => s.id),
  [6, 5]
);
console.log('ok - merge recent shows');

console.log('ALL STORE TESTS PASSED');
