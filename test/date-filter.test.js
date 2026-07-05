import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getMonthlyRange,
  getQuarterlyRange,
  getAnnualRange,
  isDateInRange,
  getQuarterString,
  getMonthString,
  getDateRange
} from '../src/utils/date-filter.js';

test('getMonthlyRange returns first and last instant of the month', () => {
  const { startDate, endDate } = getMonthlyRange(2025, 2); // Feb 2025 (not a leap year)
  assert.equal(startDate.getFullYear(), 2025);
  assert.equal(startDate.getMonth(), 1);
  assert.equal(startDate.getDate(), 1);
  assert.equal(endDate.getMonth(), 1);
  assert.equal(endDate.getDate(), 28);
  assert.equal(endDate.getHours(), 23);
});

test('getMonthlyRange rejects out-of-range month', () => {
  assert.throws(() => getMonthlyRange(2025, 0));
  assert.throws(() => getMonthlyRange(2025, 13));
});

test('getQuarterlyRange Q4 spans Oct 1 - Dec 31', () => {
  const { startDate, endDate } = getQuarterlyRange(2025, 4);
  assert.equal(startDate.getMonth(), 9); // October
  assert.equal(startDate.getDate(), 1);
  assert.equal(endDate.getMonth(), 11); // December
  assert.equal(endDate.getDate(), 31);
});

test('getQuarterlyRange rejects out-of-range quarter', () => {
  assert.throws(() => getQuarterlyRange(2025, 0));
  assert.throws(() => getQuarterlyRange(2025, 5));
});

test('getAnnualRange spans the whole year', () => {
  const { startDate, endDate } = getAnnualRange(2024);
  assert.equal(startDate.getMonth(), 0);
  assert.equal(startDate.getDate(), 1);
  assert.equal(endDate.getMonth(), 11);
  assert.equal(endDate.getDate(), 31);
});

test('isDateInRange is inclusive of the boundaries', () => {
  const start = new Date(2025, 0, 1);
  const end = new Date(2025, 0, 31, 23, 59, 59);
  assert.ok(isDateInRange(new Date(2025, 0, 15), start, end));
  assert.ok(isDateInRange('2025-01-01T00:00:00', start, end)); // accepts ISO strings
  assert.ok(!isDateInRange(new Date(2024, 11, 31), start, end));
  assert.ok(!isDateInRange(new Date(2025, 1, 1), start, end));
});

test('getQuarterString / getMonthString formatting', () => {
  assert.equal(getQuarterString(3), 'Q3');
  assert.equal(getMonthString(3), '03');
  assert.equal(getMonthString(12), '12');
  assert.throws(() => getQuarterString(5));
  assert.throws(() => getMonthString(13));
});

test('getDateRange dispatches by type and validates the period', () => {
  assert.equal(getDateRange('monthly', 2025, 3).startDate.getMonth(), 2);
  assert.equal(getDateRange('quarterly', 2025, 2).startDate.getMonth(), 3);
  assert.equal(getDateRange('annual', 2025).startDate.getMonth(), 0);
  assert.throws(() => getDateRange('monthly', 2025)); // missing period
  assert.throws(() => getDateRange('weekly', 2025)); // invalid type
});
