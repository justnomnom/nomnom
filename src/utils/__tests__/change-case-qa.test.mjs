/**
 * Frontend QA — change-case null coercion / unicode.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { paramCase, snakeCase } from '../change-case.js';

test('paramCase / snakeCase: nullish + non-string → empty (no throw)', () => {
  assert.equal(paramCase(undefined), '');
  assert.equal(snakeCase(null), '');
  assert.equal(paramCase(42), '');
  assert.equal(snakeCase({}), '');
});

test('paramCase: unicode letters stripped (ascii-only slug)', () => {
  assert.equal(paramCase('São Paulo'), 'so-paulo');
});

test('snakeCase: leading/trailing spaces collapse cleanly', () => {
  assert.equal(snakeCase('  Hello  '), 'hello');
});

test('paramCase: leading/trailing spaces trimmed (no edge hyphens)', () => {
  assert.equal(paramCase('  Hello World  '), 'hello-world');
});

test('snakeCase: internal multi-space → single underscore', () => {
  assert.equal(snakeCase('hello   world'), 'hello_world');
});
