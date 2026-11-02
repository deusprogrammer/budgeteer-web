import { useState } from 'react';
import Modal from './Modal.jsx';
import { toLocalIsoDate } from '../utils/dates.js';

export default function PaydayInput({ payday, buttonLabel = 'Add Payday', onSubmit, onClose }) {
  const [name, setName] = useState(payday?.name ?? '');
  const [amount, setAmount] = useState(payday?.amount ?? '');
  const [exampleDate, setExampleDate] = useState(payday?.exampleDate ?? toLocalIsoDate(new Date()));

  const values = {
    name: name.trim(),
    amount: amount === '' ? NaN : Number(amount),
    exampleDate,
  };
  const valid = values.name && Number.isFinite(values.amount) && /^\d{4}-\d{2}-\d{2}$/.test(exampleDate);

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onSubmit(values);
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <h3>Payday</h3>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <input
          placeholder="Amount"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <label className="inline-label">
          Last Pay Date
          <input type="date" value={exampleDate} onChange={(e) => setExampleDate(e.target.value)} />
        </label>
        <div className="actions">
          <button type="submit" className="primary" disabled={!valid}>
            {buttonLabel}
          </button>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
