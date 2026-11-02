import ExpenseInput from '../components/ExpenseInput.jsx';
import TransactionList from '../components/TransactionList.jsx';
import { useData } from '../DataContext.jsx';

export default function ExpenseView() {
  const { transactions } = useData();

  return (
    <div className="view expense-view">
      <h1 className="title">Budgeteer</h1>
      <ExpenseInput
        onAdd={(amount, category) =>
          transactions.create({ amount, category, timestamp: new Date().toISOString() })
        }
      />
      <hr />
      <TransactionList />
    </div>
  );
}
