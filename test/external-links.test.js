import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseLinksFromReadme,
  filterLinksByDateRange
} from '../src/collectors/external-links.js';

test('parses English-format dated links', () => {
  const md = 'See January 9, 2023 [Q4 Report](https://example.com/q4) for details.';
  const links = parseLinksFromReadme(md);
  assert.equal(links.length, 1);
  assert.equal(links[0].title, 'Q4 Report');
  assert.equal(links[0].url, 'https://example.com/q4');
  assert.equal(links[0].date.getFullYear(), 2023);
  assert.equal(links[0].date.getMonth(), 0);
  assert.equal(links[0].date.getDate(), 9);
  assert.equal(links[0].format, 'english');
});

test('parses Korean-format dated links', () => {
  const md = '2025년 1월 9일 [공시자료](https://example.com/ko)';
  const links = parseLinksFromReadme(md);
  assert.equal(links.length, 1);
  assert.equal(links[0].format, 'korean');
  assert.equal(links[0].title, '공시자료');
  assert.equal(links[0].date.getFullYear(), 2025);
  assert.equal(links[0].date.getMonth(), 0);
  assert.equal(links[0].date.getDate(), 9);
});

test('returns links sorted newest-first', () => {
  const md = [
    'January 1, 2023 [old](https://e/1)',
    'March 5, 2024 [new](https://e/2)'
  ].join('\n');
  const links = parseLinksFromReadme(md);
  assert.equal(links.length, 2);
  assert.equal(links[0].title, 'new'); // most recent first
  assert.equal(links[1].title, 'old');
});

test('handles empty / null input safely', () => {
  assert.deepEqual(parseLinksFromReadme(''), []);
  assert.deepEqual(parseLinksFromReadme(null), []);
  assert.deepEqual(parseLinksFromReadme(undefined), []);
});

test('filterLinksByDateRange keeps only in-range links', () => {
  const md = [
    'January 1, 2023 [a](https://e/1)',
    'June 1, 2024 [b](https://e/2)'
  ].join('\n');
  const links = parseLinksFromReadme(md);
  const filtered = filterLinksByDateRange(links, new Date(2024, 0, 1), new Date(2024, 11, 31));
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].title, 'b');
});
