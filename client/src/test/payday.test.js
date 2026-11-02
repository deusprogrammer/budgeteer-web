import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCurrency } from '../utils/currency.js';
import { dayOrdinal, formatShortDate } from '../utils/dates.js';
import {
  getBillsForPayday,
  getFuturePaydays,
  getTotalDueForPayday,
  getTransactionTotalForPayday,
} from '../utils/payday.js';

const bill = (dayOfMonth, amount = 100) => ({ id: String(dayOfMonth), name: 'B', amount, dayOfMonth });

test('formatCurrency shows credits with a leading +', () => {
  assert.equal(formatCurrency(1234.5), '$1,234.50');
  assert.equal(formatCurrency(-10), '+$10.00');
  assert.equal(formatCurrency(0), '$0.00');
});

test('dayOrdinal', () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 31].map(dayOrdinal), [
    '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '31st',
  ]);
});

test('getFuturePaydays returns most recent paydate plus iterations', () => {
  const now = new Date(2024, 3, 6, 12);
  const dates = getFuturePaydays({ exampleDate: '2024-03-14' }, 2, now);
  assert.deepEqual(dates.map(formatShortDate), ['03/28/24', '04/11/24', '04/25/24']);
});

test('getBillsForPayday within the same month', () => {
  const bills = [bill(1), bill(5), bill(18), bill(19)];
  const due = getBillsForPayday(new Date(2024, 3, 5), bills);
  assert.deepEqual(due.map((b) => b.dayOfMonth), [5, 18]);
  assert.equal(getTotalDueForPayday(new Date(2024, 3, 5), bills), 200);
});

test('getBillsForPayday spanning a month boundary', () => {
  const bills = [bill(1), bill(9), bill(11), bill(25), bill(29)];
  const due = getBillsForPayday(new Date(2024, 2, 28), bills);
  assert.deepEqual(due.map((b) => b.dayOfMonth), [29, 1, 9]);
});

test('getTransactionTotalForPayday only counts the 14 day window', () => {
  const paydate = new Date(2024, 2, 28);
  const transactions = [
    { amount: 10, timestamp: new Date(2024, 2, 27).toISOString() },
    { amount: 20, timestamp: new Date(2024, 2, 28, 9).toISOString() },
    { amount: -5, timestamp: new Date(2024, 3, 10).toISOString() },
    { amount: 40, timestamp: new Date(2024, 3, 11).toISOString() },
  ];
  assert.equal(getTransactionTotalForPayday(paydate, transactions), 15);
});
