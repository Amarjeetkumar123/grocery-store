import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../src/utils/csvParser.js';

test('plain rows, Windows line endings and Excel start marker', () => {
  assert.deepEqual(parseCsv('﻿name,price\r\nAtta,275\r\n'), [['name', 'price'], ['Atta', '275']]);
});

test('quoted cells keep commas, line breaks and doubled quotes', () => {
  assert.deepEqual(parseCsv('a,"b, c","say ""hi""","two\nlines"'), [['a', 'b, c', 'say "hi"', 'two\nlines']]);
});

test('blank lines are skipped and empty cells kept', () => {
  assert.deepEqual(parseCsv('a,,c\n\n,,\nd,e,'), [['a', '', 'c'], ['d', 'e', '']]);
});

test('an unclosed quote is reported', () => {
  assert.throws(() => parseCsv('a,"b\nc'), /never closed/);
});
