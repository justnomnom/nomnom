/**
 * Frontend QA — Google place about/images/hours/links normalization.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  detectClosedStatus,
  flattenAboutEnabled,
  normalizeLinkArray,
  normalizeOwner,
  parseHourInterval,
  parseOpenHours,
  upgradeGoogleImageUrl,
} from '../map-google-place-payload.js';

test('flattenAboutEnabled: only enabled named options', () => {
  assert.deepEqual(flattenAboutEnabled(null), []);
  assert.deepEqual(
    flattenAboutEnabled([
      {
        id: 'g1',
        name: 'Service',
        options: [
          { name: '  Outdoor  ', enabled: true },
          { name: 'Indoor', enabled: false },
          { name: '', enabled: true },
          null,
        ],
      },
      { id: 'g2', options: 'bad' },
    ]),
    [{ groupId: 'g1', groupName: 'Service', option: 'Outdoor' }]
  );
});

test('upgradeGoogleImageUrl: rewrites googleusercontent size suffixes', () => {
  const base = 'https://lh3.googleusercontent.com/p/ABC';
  assert.equal(
    upgradeGoogleImageUrl(`${base}=w397-h298-k-no`),
    `${base}=w1600-h1200-k-no`
  );
  assert.equal(upgradeGoogleImageUrl(`${base}=s120`), `${base}=w1600-h1200-k-no`);
  assert.equal(upgradeGoogleImageUrl('https://cdn.example/x.jpg'), 'https://cdn.example/x.jpg');
  assert.equal(upgradeGoogleImageUrl(null), null);
});

test('parseHourInterval: closed / invalid / simple / crosses midnight', () => {
  assert.equal(parseHourInterval('Closed'), null);
  assert.equal(parseHourInterval(''), null);
  assert.equal(parseHourInterval(null), null);
  assert.deepEqual(parseHourInterval('9:00 AM – 5:00 PM'), {
    open: '09:00',
    close: '17:00',
    crosses_midnight: false,
  });
  const late = parseHourInterval('10:00 PM – 2:00 AM');
  assert.equal(late?.crosses_midnight, true);
  assert.equal(late?.open, '22:00');
  assert.equal(late?.close, '02:00');
});

test('parseOpenHours: maps day intervals and drops closed strings', () => {
  const out = parseOpenHours({
    Monday: ['9:00 AM – 5:00 PM', 'Closed'],
    Tuesday: 'bad',
  });
  assert.equal(out.Monday.length, 1);
  assert.equal(out.Monday[0].open, '09:00');
  // Non-array day values are skipped (key absent), not empty arrays.
  assert.equal(out.Tuesday, undefined);
  assert.equal(parseOpenHours(null), null);
});

test('detectClosedStatus: status strings + all-days closed', () => {
  assert.equal(detectClosedStatus('Permanently closed', null), 'permanently_closed');
  assert.equal(detectClosedStatus('Temporarily Closed', null), 'temporarily_closed');
  assert.equal(
    detectClosedStatus('Open', {
      Mon: ['Closed'],
      Tue: ['Closed'],
    }),
    'closed_all_days'
  );
  assert.equal(
    detectClosedStatus('Open', {
      Mon: ['Closed'],
      Tue: ['9:00 AM – 5:00 PM'],
    }),
    null
  );
  assert.equal(detectClosedStatus('', null), null);
});

test('normalizeLinkArray: https only, cap 10, trim source', () => {
  assert.deepEqual(normalizeLinkArray(null), []);
  const links = Array.from({ length: 12 }, (_, i) => ({
    link: `https://ex.com/${i}`,
    source: ` s${i} `,
  }));
  const out = normalizeLinkArray([
    { link: 'ftp://bad' },
    { link: '  https://ok.com  ', source: '  X  ' },
    ...links,
  ]);
  assert.equal(out.length, 10);
  assert.equal(out[0].link, 'https://ok.com');
  assert.equal(out[0].source, 'X');
});

test('normalizeOwner: requires at least one field; invalid link → null', () => {
  assert.equal(normalizeOwner(null), null);
  assert.equal(normalizeOwner({}), null);
  assert.deepEqual(normalizeOwner({ name: '  Ada  ', link: 'not-url' }), {
    id: null,
    name: 'Ada',
    link: null,
  });
  assert.deepEqual(normalizeOwner({ id: '1', link: 'https://x.com' }), {
    id: '1',
    name: null,
    link: 'https://x.com',
  });
});
