/** Format a number as a currency string (Philippine peso by default). */
export function formatMoney(amount: number, currency = 'PHP'): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
  }).format(amount);
}
