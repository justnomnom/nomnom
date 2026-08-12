/**
 * UGC translate — early-return / same-locale paths (no LLM).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  resolveUgcDisplayLabel,
  toCanonicalEnglishLabel,
  attachMustTryDisplayToListItems,
  ugcContentHash,
} from '../ugc-translate.js';

test('ugcContentHash re-export: stable for same inputs', () => {
  assert.equal(ugcContentHash('pasta', 'en'), ugcContentHash('pasta', 'en'));
  assert.notEqual(ugcContentHash('pasta', 'en'), ugcContentHash('pasta', 'pt'));
});

test('resolveUgcDisplayLabel: same locale returns original without DB', async () => {
  const supabase = {
    from() {
      throw new Error('should not hit cache');
    },
  };
  assert.equal(await resolveUgcDisplayLabel(supabase, 'Bacalhau', 'pt', 'pt'), 'Bacalhau');
  assert.equal(await resolveUgcDisplayLabel(supabase, 'Rice', 'en-US', 'en'), 'Rice');
});

test('toCanonicalEnglishLabel: empty / already en', async () => {
  const supabase = {
    from() {
      throw new Error('should not hit cache');
    },
  };
  assert.equal(await toCanonicalEnglishLabel(supabase, '', 'pt'), '');
  assert.equal(await toCanonicalEnglishLabel(supabase, '  ', 'pt'), '');
  assert.equal(await toCanonicalEnglishLabel(supabase, ' Pasta ', 'en'), 'Pasta');
  assert.equal(await toCanonicalEnglishLabel(supabase, null, 'en'), '');
});

test('attachMustTryDisplayToListItems: empty / same-locale dishes skip LLM', async () => {
  const supabase = {
    from() {
      throw new Error('should not hit cache');
    },
  };
  assert.deepEqual(await attachMustTryDisplayToListItems(supabase, null, 'en'), []);
  assert.deepEqual(await attachMustTryDisplayToListItems(supabase, [], 'pt'), []);

  const items = [
    {
      id: 'li1',
      list_item_must_try_dishes: [
        { id: 'd1', label: 'Pasta', label_locale: 'en', sort_order: 1, tag_id: null },
        { id: 'd0', label: 'Soup', label_locale: 'en', sort_order: 0, tag_id: null },
      ],
    },
  ];
  const out = await attachMustTryDisplayToListItems(supabase, items, 'en');
  assert.equal(out.length, 1);
  assert.ok(!('list_item_must_try_dishes' in out[0]));
  assert.deepEqual(
    out[0].must_try_dishes.map((d) => d.display_label),
    ['Soup', 'Pasta']
  );
});

test('attachMustTryDisplayToListItems: tag_id label treated as English source', async () => {
  const supabase = {
    from() {
      throw new Error('should not hit cache');
    },
  };
  const items = [
    {
      id: 'li1',
      list_item_must_try_dishes: [
        {
          id: 'd1',
          label: 'massa',
          label_locale: 'pt',
          sort_order: 0,
          tag_id: 'tag-1',
          tags: { label: 'Pasta' },
        },
      ],
    },
  ];
  const out = await attachMustTryDisplayToListItems(supabase, items, 'en');
  assert.equal(out[0].must_try_dishes[0].display_label, 'Pasta');
});
