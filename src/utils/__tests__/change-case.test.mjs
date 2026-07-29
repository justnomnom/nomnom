import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paramCase, snakeCase } from '../change-case.js';

// paramCase
test('paramCase: lowercase + spaces to hyphens', () => {
  assert.equal(paramCase('Hello World'), 'hello-world');
});
test('paramCase: multiple spaces collapse to one hyphen', () => {
  assert.equal(paramCase('a  b'), 'a-b');
});
test('paramCase: strips special characters', () => {
  assert.equal(paramCase('foo@bar!'), 'foobar');
});
test('paramCase: preserves existing hyphens', () => {
  assert.equal(paramCase('ABC-DEF'), 'abc-def');
});
test('paramCase: digits preserved', () => {
  assert.equal(paramCase('item 42'), 'item-42');
});
test('paramCase: empty string', () => {
  assert.equal(paramCase(''), '');
});
test('paramCase: already lowercase no spaces', () => {
  assert.equal(paramCase('hello'), 'hello');
});

// snakeCase
test('snakeCase: lowercase + spaces to underscores', () => {
  assert.equal(snakeCase('Hello World'), 'hello_world');
});
test('snakeCase: multiple spaces collapse to one underscore', () => {
  assert.equal(snakeCase('a  b'), 'a_b');
});
test('snakeCase: hyphens stripped (not kept like paramCase)', () => {
  assert.equal(snakeCase('foo-bar'), 'foobar');
});
test('snakeCase: preserves existing underscores', () => {
  assert.equal(snakeCase('foo_bar'), 'foo_bar');
});
test('snakeCase: digits preserved', () => {
  assert.equal(snakeCase('item 42'), 'item_42');
});
test('snakeCase: empty string', () => {
  assert.equal(snakeCase(''), '');
});
