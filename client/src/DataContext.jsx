import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const DataContext = createContext(null);

function useResource(client, sortFn, setError) {
  const [items, setItems] = useState([]);

  const run = useCallback(
    async (fn) => {
      try {
        setError(null);
        return await fn();
      } catch (err) {
        setError(err.message);
      }
    },
    [setError],
  );

  const reload = useCallback(
    () => run(async () => setItems(await client.list())),
    [client, run],
  );

  const actions = useMemo(
    () => ({
      create: (data) =>
        run(async () => {
          const created = await client.create(data);
          setItems((prev) => [...prev, created]);
        }),
      update: (id, data) =>
        run(async () => {
          const updated = await client.update(id, data);
          setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
        }),
      remove: (id) =>
        run(async () => {
          await client.remove(id);
          setItems((prev) => prev.filter((item) => item.id !== id));
        }),
    }),
    [client, run],
  );

  const sorted = useMemo(() => [...items].sort(sortFn), [items, sortFn]);
  return { items: sorted, reload, ...actions };
}

const byTimestampDesc = (a, b) => new Date(b.timestamp) - new Date(a.timestamp);
const byDayOfMonth = (a, b) => a.dayOfMonth - b.dayOfMonth || a.name.localeCompare(b.name);
const byName = (a, b) => a.name.localeCompare(b.name);

export function DataProvider({ children }) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const transactions = useResource(api.transactions, byTimestampDesc, setError);
  const bills = useResource(api.bills, byDayOfMonth, setError);
  const paydays = useResource(api.paydays, byName, setError);

  useEffect(() => {
    Promise.all([transactions.reload(), bills.reload(), paydays.reload()]).finally(() =>
      setLoading(false),
    );
  }, [transactions.reload, bills.reload, paydays.reload]);

  const value = { transactions, bills, paydays, error, loading, clearError: () => setError(null) };
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}
