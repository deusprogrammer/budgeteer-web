import { formatCurrency } from '../utils/currency.js';
import { dayOrdinal } from '../utils/dates.js';
import { getBillsForPayday, sumAmounts } from '../utils/payday.js';

export default function PaydayView({ bills, payday, paydate }) {
  const due = getBillsForPayday(paydate, bills);

  if (due.length === 0) {
    return <p className="empty">No bills for this pay period</p>;
  }

  const amountDue = sumAmounts(due);

  return (
    <div className="payday-view">
      <table className="bill-grid">
        <tbody>
          {due.map((bill) => (
            <tr key={bill.id}>
              <td>{dayOrdinal(bill.dayOfMonth)}</td>
              <td>{bill.name}</td>
              <td className="num">{formatCurrency(bill.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="summary">
        <dt>Total Due</dt>
        <dd>{formatCurrency(amountDue)}</dd>
        <dt>Left Over</dt>
        <dd>{formatCurrency(payday.amount - amountDue)}</dd>
      </dl>
    </div>
  );
}
