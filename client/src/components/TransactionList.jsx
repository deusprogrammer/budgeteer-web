import { useMemo } from 'react';
import { useData } from '../DataContext.jsx';
import { formatCurrency } from '../utils/currency.js';
import { formatShortDate } from '../utils/dates.js';
import {
  getFuturePaydays,
  getTotalDueForPayday,
  getTransactionTotalForPayday,
  sumAmounts,
} from '../utils/payday.js';

function groupByDate(transactions) {
  const groups = new Map();
  for (const t of transactions) {
    const key = formatShortDate(new Date(t.timestamp));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  return [...groups.entries()];
}

export default function TransactionList() {
  const { transactions, bills, paydays } = useData();
  const groups = useMemo(() => groupByDate(transactions.items), [transactions.items]);

  const summary = useMemo(() => {
    const spent = sumAmounts(transactions.items);
    const payday = paydays.items[0];
    if (!payday) return { pay: 0, billsDue: 0, spent, left: 0 };

    const [currentPaydate] = getFuturePaydays(payday, 1);
    const billsDue = getTotalDueForPayday(currentPaydate, bills.items);
    const periodSpent = getTransactionTotalForPayday(currentPaydate, transactions.items);
    return { pay: payday.amount, billsDue, spent, left: payday.amount - billsDue - periodSpent };
  }, [transactions.items, bills.items, paydays.items]);

  return (
    <div className="transaction-list">
      <h3>Transactions</h3>
      <div className="list scroll">
        {groups.length === 0 && <p className="empty">No transactions yet</p>}
        {groups.map(([date, items]) => (
          <section key={date}>
            <h4 className="section-header">
              {date} {formatCurrency(sumAmounts(items))}
            </h4>
            <ul>
              {items.map((t) => (
                <li key={t.id} className="row">
                  <span>{t.category}</span>
                  <span className="spacer" />
                  <span>{formatCurrency(t.amount)}</span>
                  <button
                    type="button"
                    className="icon-button danger"
                    title="Delete"
                    onClick={() => transactions.remove(t.id)}
                  >
                    🗑
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <dl className="summary">
        <dt>Pay</dt>
        <dd>{formatCurrency(summary.pay)}</dd>
        <dt>Bills</dt>
        <dd>{formatCurrency(summary.billsDue)}</dd>
        <dt>Spent</dt>
        <dd>{formatCurrency(summary.spent)}</dd>
        <dt>Left</dt>
        <dd>{formatCurrency(summary.left)}</dd>
      </dl>
    </div>
  );
}
