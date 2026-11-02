import { useState } from 'react';
import PaydayInput from '../components/PaydayInput.jsx';
import { useData } from '../DataContext.jsx';
import { formatCurrency } from '../utils/currency.js';
import { formatShortDate, parseLocalDate } from '../utils/dates.js';

export default function PaydayEditorView() {
  const { paydays } = useData();
  const [selectedPayday, setSelectedPayday] = useState(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="view payday-editor">
      <header className="toolbar">
        <h2>Paydays</h2>
        <span className="spacer" />
        <button type="button" className="icon-button" title="Add Payday" onClick={() => setAdding(true)}>
          ＋
        </button>
      </header>
      <ul className="list">
        {paydays.items.length === 0 && <li className="empty">No paydays yet</li>}
        {paydays.items.map((payday) => (
          <li key={payday.id} className="row">
            <span>
              {formatCurrency(payday.amount)} from {payday.name} on the{' '}
              {formatShortDate(parseLocalDate(payday.exampleDate))}
            </span>
            <span className="spacer" />
            <button type="button" className="icon-button" title="Edit" onClick={() => setSelectedPayday(payday)}>
              ✏️
            </button>
            <button
              type="button"
              className="icon-button danger"
              title="Delete"
              onClick={() => paydays.remove(payday.id)}
            >
              🗑
            </button>
          </li>
        ))}
      </ul>
      {selectedPayday && (
        <PaydayInput
          payday={selectedPayday}
          buttonLabel="Update Payday"
          onSubmit={(values) => paydays.update(selectedPayday.id, values)}
          onClose={() => setSelectedPayday(null)}
        />
      )}
      {adding && <PaydayInput onSubmit={paydays.create} onClose={() => setAdding(false)} />}
    </div>
  );
}
