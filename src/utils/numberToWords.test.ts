import { describe, it, expect } from 'vitest';
import { amountToWords } from './numberToWords';

describe('amountToWords', () => {
  it('spells zero', () => {
    expect(amountToWords(0)).toBe('Zero Pesos');
  });

  it('uses singular peso for exactly one', () => {
    expect(amountToWords(1)).toBe('One Peso');
  });

  it('spells simple amounts', () => {
    expect(amountToWords(59)).toBe('Fifty-Nine Pesos');
    expect(amountToWords(20)).toBe('Twenty Pesos');
    expect(amountToWords(94)).toBe('Ninety-Four Pesos');
  });

  it('spells hundreds and thousands', () => {
    expect(amountToWords(100)).toBe('One Hundred Pesos');
    expect(amountToWords(215)).toBe('Two Hundred Fifteen Pesos');
    expect(amountToWords(1234)).toBe(
      'One Thousand Two Hundred Thirty-Four Pesos'
    );
  });

  it('includes centavos when present', () => {
    expect(amountToWords(94.5)).toBe('Ninety-Four Pesos and Fifty Centavos');
    expect(amountToWords(1.01)).toBe('One Peso and One Centavo');
  });

  it('rounds to two decimal places', () => {
    expect(amountToWords(10.999)).toBe('Eleven Pesos');
    expect(amountToWords(10.254)).toBe('Ten Pesos and Twenty-Five Centavos');
  });

  it('treats negatives as their absolute value', () => {
    expect(amountToWords(-5)).toBe('Five Pesos');
  });
});
