import { useCallback, useEffect, useRef, useState } from 'react';
import NumberPad from './NumberPad.jsx';
import { formatCurrency } from '../utils/currency.js';

export const CATEGORIES = [
  'Meal',
  'Groceries',
  'Discretionary',
  'Gas',
  'Car',
  'Home',
  'Health',
  'Bills',
  'Adjustment',
  'Other',
];

/** Cash-register style input: digits accumulate as cents. */
export default function ExpenseInput({ onAdd }) {
  const [digits, setDigits] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const cents = digits ? Number(digits) : 0;

  const press = useCallback((key) => {
    if (key === 'C') return setDigits('');
    if (key === '<') return setDigits((d) => d.slice(0, -1));
    setDigits((d) => (d === '' && key === '0' ? d : d + key));
  }, []);

  const add = useCallback(
    (category = 'Uncategorized', credit = false) => {
      setMenuOpen(false);
      if (!digits) return;
      onAdd((credit ? -1 : 1) * (cents / 100), category);
      setDigits('');
    },
    [digits, cents, onAdd],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select, .modal')) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('<');
      else if (e.key === 'Delete' || e.key.toLowerCase() === 'c') press('C');
      else if (e.key === 'Enter' && !e.target.closest?.('.menu')) add();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, add]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => !menuRef.current?.contains(e.target) && setMenuOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  return (
    <div className="expense-input">
      <div className="amount-display">
        <span className="amount">{formatCurrency(cents / 100)}</span>
        <div className="split-button" ref={menuRef}>
          <button
            type="button"
            className="circle-button primary"
            title="Add uncategorized expense"
            onClick={() => add()}
          >
            +
          </button>
          <button
            type="button"
            className="menu-toggle"
            aria-label="Choose category"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            ▾
          </button>
          {menuOpen && (
            <ul className="menu" role="menu">
              {CATEGORIES.map((category) => (
                <li key={category}>
                  <button type="button" role="menuitem" onClick={() => add(category)}>
                    {category}
                  </button>
                </li>
              ))}
              <li>
                <button type="button" role="menuitem" onClick={() => add('Credit', true)}>
                  Credit
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>
      <NumberPad onPress={press} />
    </div>
  );
}
