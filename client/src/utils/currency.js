const numberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Negative amounts are credits and are displayed with a leading "+".
export function formatCurrency(amount) {
  const prefix = amount < 0 ? '+' : '';
  return `${prefix}$${numberFormatter.format(Math.abs(amount))}`;
}
