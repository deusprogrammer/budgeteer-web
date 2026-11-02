import { addDays, parseLocalDate } from './dates.js';

const PAY_PERIOD_DAYS = 14;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function getDaysInMonth(month, year) {
  if (month === 2) return year % 4 === 0 ? 29 : 28;
  return DAYS_IN_MONTH[month - 1];
}

/**
 * Returns the most recent paydate (on or before `now`) followed by
 * `iterations` subsequent bi-weekly paydates.
 */
export function getFuturePaydays(payday, iterations, now = new Date()) {
  let targetPaydate = now;
  let currentPaydate = parseLocalDate(payday.exampleDate);

  while (currentPaydate <= now) {
    targetPaydate = currentPaydate;
    currentPaydate = addDays(currentPaydate, PAY_PERIOD_DAYS);
  }

  const dates = [];
  for (let i = 0; i <= iterations; i++) {
    dates.push(addDays(targetPaydate, PAY_PERIOD_DAYS * i));
  }
  return dates;
}

export function getTransactionsForPayday(paydate, transactions) {
  const nextPaydate = addDays(paydate, PAY_PERIOD_DAYS);
  return transactions.filter((t) => {
    const timestamp = new Date(t.timestamp);
    return timestamp >= paydate && timestamp < nextPaydate;
  });
}

export function getTransactionTotalForPayday(paydate, transactions) {
  return sumAmounts(getTransactionsForPayday(paydate, transactions));
}

export function getBillsForPayday(paydate, bills) {
  const day1 = paydate.getDate();
  const month1 = paydate.getMonth() + 1;
  const year1 = paydate.getFullYear();
  const day2 = addDays(paydate, PAY_PERIOD_DAYS).getDate();

  const dueThisMonth = bills.filter((bill) => {
    if (day2 < day1) {
      return bill.dayOfMonth >= day1 && bill.dayOfMonth < getDaysInMonth(month1, year1);
    }
    return bill.dayOfMonth >= day1 && bill.dayOfMonth < day2;
  });

  const dueNextMonth = bills.filter((bill) => {
    if (day2 > day1) return false;
    return bill.dayOfMonth >= 1 && bill.dayOfMonth < day2;
  });

  return [...dueThisMonth, ...dueNextMonth];
}

export function getTotalDueForPayday(paydate, bills) {
  return sumAmounts(getBillsForPayday(paydate, bills));
}

export function sumAmounts(items) {
  return items.reduce((total, item) => total + item.amount, 0);
}
