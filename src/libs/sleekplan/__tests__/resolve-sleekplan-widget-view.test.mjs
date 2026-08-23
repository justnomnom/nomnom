import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { resolveSleekplanWidgetView } from '../sleekplan-service.js';

describe('resolveSleekplanWidgetView', () => {
  test('omits the argument for the default home screen', () => {
    assert.equal(resolveSleekplanWidgetView(), undefined);
    assert.equal(resolveSleekplanWidgetView(undefined), undefined);
    assert.equal(resolveSleekplanWidgetView(''), undefined);
  });

  test('does not pass home — Sleekplan 404s on #/home', () => {
    assert.equal(resolveSleekplanWidgetView('home'), undefined);
  });

  test('keeps board and compose views', () => {
    assert.equal(resolveSleekplanWidgetView('feedback'), 'feedback');
    assert.equal(resolveSleekplanWidgetView('feedback.add'), 'feedback.add');
  });
});
