import { useState } from 'react';
import BillInput from '../components/BillInput.jsx';
import { useData } from '../DataContext.jsx';
import { formatCurrency } from '../utils/currency.js';
import { dayOrdinal } from '../utils/dates.js';

export default function BillEditorView() {
  const { bills } = useData();
  const [selectedBill, setSelectedBill] = useState(null);

  return (
    <div className="bill-editor">
      <h3>Bills</h3>
      <ul className="list">
        {bills.items.length === 0 && <li className="empty">No bills yet</li>}
        {bills.items.map((bill) => (
          <li key={bill.id} className="row">
            <span>
              {formatCurrency(bill.amount)} to {bill.name} on the {dayOrdinal(bill.dayOfMonth)}
            </span>
            <span className="spacer" />
            <button type="button" className="icon-button" title="Edit" onClick={() => setSelectedBill(bill)}>
              ✏️
            </button>
            <button
              type="button"
              className="icon-button danger"
              title="Delete"
              onClick={() => bills.remove(bill.id)}
            >
              🗑
            </button>
          </li>
        ))}
      </ul>
      {selectedBill && (
        <BillInput
          bill={selectedBill}
          buttonLabel="Update Bill"
          onSubmit={(values) => bills.update(selectedBill.id, values)}
          onClose={() => setSelectedBill(null)}
        />
      )}
    </div>
  );
}
