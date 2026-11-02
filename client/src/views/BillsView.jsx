import { useEffect, useRef, useState } from 'react';
import BillInput from '../components/BillInput.jsx';
import PaydayInput from '../components/PaydayInput.jsx';
import BillEditorView from './BillEditorView.jsx';
import BillScheduleView from './BillScheduleView.jsx';
import { useData } from '../DataContext.jsx';

export default function BillsView() {
  const { bills, paydays } = useData();
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => !menuRef.current?.contains(e.target) && setMenuOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const open = (name) => {
    setMenuOpen(false);
    setModal(name);
  };

  return (
    <div className="view bills-view">
      <header className="toolbar">
        {editing ? (
          <button type="button" className="link-button" onClick={() => setEditing(false)}>
            ‹ Bill Schedule
          </button>
        ) : (
          <h2>Bill Schedule</h2>
        )}
        <span className="spacer" />
        {!editing && (
          <button type="button" className="icon-button" title="Edit bills" onClick={() => setEditing(true)}>
            ✏️
          </button>
        )}
        <div className="dropdown" ref={menuRef}>
          <button
            type="button"
            className="icon-button"
            title="Add"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            ＋
          </button>
          {menuOpen && (
            <ul className="menu right" role="menu">
              <li>
                <button type="button" role="menuitem" onClick={() => open('bill')}>
                  Add Bill
                </button>
              </li>
              <li>
                <button type="button" role="menuitem" onClick={() => open('payday')}>
                  Add Payday
                </button>
              </li>
            </ul>
          )}
        </div>
      </header>

      {editing ? (
        <BillEditorView />
      ) : (
        <BillScheduleView bills={bills.items} paydays={paydays.items} />
      )}

      {modal === 'bill' && <BillInput onSubmit={bills.create} onClose={() => setModal(null)} />}
      {modal === 'payday' && <PaydayInput onSubmit={paydays.create} onClose={() => setModal(null)} />}
    </div>
  );
}
