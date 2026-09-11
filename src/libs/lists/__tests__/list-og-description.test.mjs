import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { listOgDescription } from '../list-og-description.js';

describe('listOgDescription', () => {
  it('prefers the list’s own description', () => {
    assert.equal(
      listOgDescription({
        description: '  Weeknight tascas.  ',
        ownerUsername: 'ana',
      }),
      'Weeknight tascas.'
    );
  });

  it('uses NomNom List by @handle when there is no blurb', () => {
    assert.equal(
      listOgDescription({ description: '', ownerUsername: 'ana' }),
      'NomNom List by @ana'
    );
    assert.equal(
      listOgDescription({ ownerUsername: '@ana' }),
      'NomNom List by @ana'
    );
  });

  it('falls back to display name, then the brand tagline', () => {
    assert.equal(
      listOgDescription({ ownerName: 'Ana' }),
      'NomNom List by Ana'
    );
    assert.equal(listOgDescription({}), 'Restaurant picks from people you trust');
  });

  it('uses Portuguese byline when lang is pt', () => {
    assert.equal(
      listOgDescription({ ownerUsername: 'ana' }, 'pt'),
      'NomNom List por @ana'
    );
  });
});
