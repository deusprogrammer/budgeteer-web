import { useState } from 'react';
import { DataProvider, useData } from './DataContext.jsx';
import ExpenseView from './views/ExpenseView.jsx';
import BillsView from './views/BillsView.jsx';
import PaydayEditorView from './views/PaydayEditorView.jsx';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import LoginView from './views/LoginView.jsx';

const TABS = [
  { id: 'expenses', label: 'Expenses', icon: '$', View: ExpenseView },
  { id: 'bills', label: 'Bills', icon: '💵', View: BillsView },
  { id: 'paydays', label: 'Paydays', icon: '📅', View: PaydayEditorView },
];

function Shell() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('expenses');
  const { error, clearError, loading } = useData();
  const { View } = TABS.find((t) => t.id === tab);

  return (
    <div className="app">
      <header className="account-bar">
        <span>{user.username}</span>
        <button type="button" className="link-button" onClick={logout}>Sign out</button>
      </header>
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" className="icon-button" onClick={clearError} title="Dismiss">
            ✕
          </button>
        </div>
      )}
      <main>{loading ? <p className="empty">Loading…</p> : <View />}</main>
      <nav className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={t.id === tab ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function AuthenticatedApp() {
  const { user } = useAuth();
  if (!user) return <LoginView />;
  return (
    <DataProvider key={user.id}>
      <Shell />
    </DataProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
