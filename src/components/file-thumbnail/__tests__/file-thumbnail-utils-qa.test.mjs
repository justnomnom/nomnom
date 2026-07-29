/**
 * Frontend QA — file thumbnail type classification.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  fileData,
  fileFormat,
  fileNameByUrl,
  fileThumbIcon,
  fileTypeByUrl,
} from '../utils.js';

test('fileTypeByUrl / fileNameByUrl', () => {
  assert.equal(fileTypeByUrl('https://cdn.x/a/b/photo.PNG'), 'PNG');
  assert.equal(fileTypeByUrl(''), '');
  assert.equal(fileTypeByUrl(null), '');
  assert.equal(fileNameByUrl('https://cdn.x/a/b/photo.png'), 'photo.png');
});

test('fileFormat: maps known extensions to categories', () => {
  assert.equal(fileFormat('x.pdf'), 'pdf');
  assert.equal(fileFormat('x.docx'), 'word');
  assert.equal(fileFormat('x.xlsx'), 'excel');
  assert.equal(fileFormat('x.mp4'), 'video');
  assert.equal(fileFormat('x.mp3'), 'audio');
  assert.equal(fileFormat('x.png'), 'image');
  assert.equal(fileFormat('x.zip'), 'zip');
  assert.equal(fileFormat('x.unknown'), 'unknown');
});

test('fileThumbIcon: returns iconify id per format', () => {
  assert.ok(fileThumbIcon('a.pdf').includes('pdf'));
  assert.ok(fileThumbIcon('a.png').includes('gallery'));
  assert.equal(fileThumbIcon('a.zzz'), 'solar:file-bold');
});

test('fileData: string URL vs File-like object', () => {
  assert.deepEqual(fileData('https://x.com/a.jpg'), {
    key: 'https://x.com/a.jpg',
    preview: 'https://x.com/a.jpg',
    name: 'a.jpg',
    type: 'jpg',
  });
  const file = {
    preview: 'blob:1',
    name: 'f.png',
    size: 10,
    path: '/tmp/f.png',
    type: 'image/png',
    lastModified: 1,
    lastModifiedDate: null,
  };
  assert.equal(fileData(file).key, 'blob:1');
  assert.equal(fileData(file).name, 'f.png');
});
