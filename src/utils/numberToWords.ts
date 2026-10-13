/**
 * Spell out a peso amount in English words, e.g. 1234.50 →
 * "One Thousand Two Hundred Thirty-Four Pesos and Fifty Centavos".
 *
 * Supports 0 up to the billions range, which is far beyond any single
 * street-food sale, and rounds to 2 decimal places (centavos).
 */

const ONES = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight',
  'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
  'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty',
  'Ninety',
];

const SCALES = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

/** Convert an integer 0–999 to words (no scale word). */
function threeDigitsToWords(n: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;

  if (hundreds > 0) parts.push(`${ONES[hundreds]} Hundred`);

  if (rest > 0) {
    if (rest < 20) {
      parts.push(ONES[rest]);
    } else {
      const tens = Math.floor(rest / 10);
      const ones = rest % 10;
      parts.push(ones > 0 ? `${TENS[tens]}-${ONES[ones]}` : TENS[tens]);
    }
  }

  return parts.join(' ');
}

/** Convert a non-negative integer to words. */
function integerToWords(n: number): string {
  if (n === 0) return 'Zero';

  const groups: number[] = [];
  let remaining = n;
  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i];
    if (group === 0) continue;
    const words = threeDigitsToWords(group);
    parts.push(SCALES[i] ? `${words} ${SCALES[i]}` : words);
  }

  return parts.join(' ');
}

/**
 * Spell out a peso amount including centavos. Negative inputs are treated as
 * their absolute value (a receipt total is never negative).
 */
export function amountToWords(amount: number): string {
  const safe = Math.abs(Number.isFinite(amount) ? amount : 0);
  // Round to whole centavos first so e.g. 10.999 becomes 11.00 (not 10 pesos
  // + 100 centavos). Splitting after rounding avoids a carry bug.
  const totalCentavos = Math.round(safe * 100);
  const pesos = Math.floor(totalCentavos / 100);
  const centavos = totalCentavos % 100;

  const pesoWords = `${integerToWords(pesos)} ${
    pesos === 1 ? 'Peso' : 'Pesos'
  }`;

  if (centavos === 0) return pesoWords;

  const centavoWords = `${integerToWords(centavos)} ${
    centavos === 1 ? 'Centavo' : 'Centavos'
  }`;
  return `${pesoWords} and ${centavoWords}`;
}
