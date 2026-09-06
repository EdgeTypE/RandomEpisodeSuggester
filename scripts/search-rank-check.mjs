// Unit test for rankShows in src/lib/tvmaze.ts (no network).
// Run: npm run test:search
import assert from 'node:assert/strict';

const { rankShows, matchPinnedIds } = await import('../node_modules/.tmp/tvmaze/tvmaze.js');

const sh = (id, name, rating = null, img = true) => ({
  id,
  name,
  premiered: '2010-01-01',
  rating: rating == null ? null : { average: rating },
  image: img ? { medium: 'x' } : null
});
const names = (list) => list.map((s) => s.name);

// 1. exact > prefix > contains; fuzzy junk dropped when good matches exist
{
  const res = rankShows(
    [
      sh(1, 'Totally Unknown Show'),
      sh(2, 'Sherlock Holmes and the Case'),
      sh(3, 'Sherlock', 9.2),
      sh(4, 'Obscure Fuzzy Match', null, false)
    ],
    'sherlock'
  );
  assert.deepEqual(names(res), ['Sherlock', 'Sherlock Holmes and the Case']);
  console.log('ok - exact/prefix first, fuzzy junk dropped');
}

// 2. within same tier, higher rating first; poster breaks rating ties
{
  const res = rankShows(
    [sh(1, 'Breaking the Band', 9.9), sh(2, 'Breaking Bad', 9.5), sh(3, 'Breaking Point', 9.5, false)],
    'breaking'
  );
  assert.deepEqual(names(res), ['Breaking the Band', 'Breaking Bad', 'Breaking Point']);
  console.log('ok - rating/poster tiebreak');
}

// 3. word-prefix match + high-rated fuzzy junk dropped ("nine")
{
  const res = rankShows(
    [sh(1, 'Nina', 9.9), sh(2, 'Cloud Nine', 7.0), sh(3, 'Brooklyn Nine-Nine', 8.4)],
    'nine'
  );
  assert.deepEqual(names(res), ['Brooklyn Nine-Nine', 'Cloud Nine']);
  console.log('ok - word-prefix first, fuzzy junk dropped');
}

// 4. typo fallback: nothing matches well -> fuzzy leftovers are KEPT
{
  const res = rankShows([sh(1, 'Breaking Bad', 9.5)], 'braking bad');
  assert.deepEqual(names(res), ['Breaking Bad']);
  console.log('ok - typo fallback kept');
}

// 5. case/diacritics-insensitive
{
  const res = rankShows([sh(1, 'The Mentalist', 8.1)], 'MENTALIST');
  assert.deepEqual(names(res), ['The Mentalist']);
  console.log('ok - case-insensitive contains');
}

// 6. pinned famous titles: short queries still find them
{
  assert.deepEqual(matchPinnedIds('sher'), [335]);
  assert.deepEqual(matchPinnedIds('brook'), [49]);
  assert.deepEqual(matchPinnedIds('mentalist'), [116]);
  assert.deepEqual(matchPinnedIds('th'), []); // too short
  assert.deepEqual(matchPinnedIds('xyz unknown'), []);
  console.log('ok - pinned famous titles');
}

console.log('ALL SEARCH TESTS PASSED');
