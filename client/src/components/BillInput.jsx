import { useState } from 'react';
import Modal from './Modal.jsx';

const toNumber = (v) => (v === '' ? NaN : Number(v));

export default function BillInput({ bill, buttonLabel = 'Add Bill', onSubmit, onClose }) {
  const [name, setName] = useState(bill?.name ?? '');
  const [amount, setAmount] = useState(bill?.amount ?? '');
  const [leftToPay, setLeftToPay] = useState(bill?.leftToPay ?? '');
  const [dayOfMonth, setDayOfMonth] = useState(bill?.dayOfMonth ?? '');

  const values = {
    name: name.trim(),
    amount: toNumber(amount),
    leftToPay: toNumber(leftToPay),
    dayOfMonth: toNumber(dayOfMonth),
  };
  const valid =
    values.name &&
    Number.isFinite(values.amount) &&
    Number.isFinite(values.leftToPay) &&
    Number.isInteger(values.dayOfMonth) &&
    values.dayOfMonth >= 1 &&
    values.dayOfMonth <= 31;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onSubmit(values);
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <h3>{bill ? 'Edit Bill' : 'New Bill'}</h3>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <input
          placeholder="Amount"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          placeholder="Amount Left"
          type="number"
          step="0.01"
          value={leftToPay}
          onChange={(e) => setLeftToPay(e.target.value)}
        />
        <input
          placeholder="Day Of Month"
          type="number"
          min="1"
          max="31"
          step="1"
          value={dayOfMonth}
          onChange={(e) => setDayOfMonth(e.target.value)}
        />
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
