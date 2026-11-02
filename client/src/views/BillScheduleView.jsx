import { useMemo, useState } from 'react';
import PaydayView from './PaydayView.jsx';
import { formatShortDate } from '../utils/dates.js';
import { getFuturePaydays } from '../utils/payday.js';

export default function BillScheduleView({ bills, paydays }) {
  const [selectedId, setSelectedId] = useState(null);
  const payday = paydays.find((p) => p.id === selectedId) ?? paydays[0];

  const dates = useMemo(() => (payday ? getFuturePaydays(payday, 25) : []), [payday]);

  if (!payday) {
    return <p className="empty">You must have at least one income source</p>;
  }

  return (
    <div className="bill-schedule">
      <label className="inline-label">
        <strong>Income Source</strong>
        <select value={payday.id} onChange={(e) => setSelectedId(e.target.value)}>
          {paydays.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <div className="list scroll">
        {dates.map((date) => (
          <section key={date.toISOString()}>
            <h4 className="section-header">{formatShortDate(date)}</h4>
            <PaydayView bills={bills} payday={payday} paydate={date} />
          </section>
        ))}
      </div>
    </div>
  );
}
