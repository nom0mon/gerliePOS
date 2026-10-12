import { describe, it, expect } from 'vitest';
import {
  cartReducer,
  cartTotal,
  cartCount,
  lineTotal,
  type CartLine,
} from './CartContext';
import type { Product } from '../types';

const soda: Product = {
  id: 1,
  name: 'Soda',
  price: 2.5,
  stockQuantity: 3,
  salesCount: 0,
};
const chips: Product = {
  id: 2,
  name: 'Chips',
  price: 1.75,
  stockQuantity: 10,
  salesCount: 0,
};

const empty = { lines: [] as CartLine[] };

describe('cartReducer', () => {
  it('adds a new product as a line with quantity 1', () => {
    const state = cartReducer(empty, { type: 'ADD', product: soda });
    expect(state.lines).toHaveLength(1);
    expect(state.lines[0]).toMatchObject({
      productId: 1,
      name: 'Soda',
      unitPrice: 2.5,
      quantity: 1,
      stockAvailable: 3,
    });
  });

  it('increments quantity when adding an existing product', () => {
    let state = cartReducer(empty, { type: 'ADD', product: soda });
    state = cartReducer(state, { type: 'ADD', product: soda });
    expect(state.lines).toHaveLength(1);
    expect(state.lines[0].quantity).toBe(2);
  });

  it('does not exceed available stock when adding', () => {
    let state = empty;
    for (let i = 0; i < 5; i++) {
      state = cartReducer(state, { type: 'ADD', product: soda });
    }
    expect(state.lines[0].quantity).toBe(3); // capped at stockQuantity
  });

  it('ignores out-of-stock products', () => {
    const state = cartReducer(empty, {
      type: 'ADD',
      product: { ...soda, stockQuantity: 0 },
    });
    expect(state.lines).toHaveLength(0);
  });

  it('sets quantity and caps it at stock', () => {
    let state = cartReducer(empty, { type: 'ADD', product: soda });
    state = cartReducer(state, { type: 'SET_QTY', productId: 1, quantity: 99 });
    expect(state.lines[0].quantity).toBe(3);
  });

  it('removes a line when quantity set to 0 or below', () => {
    let state = cartReducer(empty, { type: 'ADD', product: soda });
    state = cartReducer(state, { type: 'SET_QTY', productId: 1, quantity: 0 });
    expect(state.lines).toHaveLength(0);
  });

  it('removes a specific line', () => {
    let state = cartReducer(empty, { type: 'ADD', product: soda });
    state = cartReducer(state, { type: 'ADD', product: chips });
    state = cartReducer(state, { type: 'REMOVE', productId: 1 });
    expect(state.lines.map((l) => l.productId)).toEqual([2]);
  });

  it('clears the cart', () => {
    let state = cartReducer(empty, { type: 'ADD', product: soda });
    state = cartReducer(state, { type: 'ADD', product: chips });
    state = cartReducer(state, { type: 'CLEAR' });
    expect(state.lines).toHaveLength(0);
  });
});

describe('cart totals', () => {
  it('computes line and cart totals', () => {
    let state = cartReducer(empty, { type: 'ADD', product: soda });
    state = cartReducer(state, { type: 'ADD', product: soda }); // 2 x 2.5
    state = cartReducer(state, { type: 'ADD', product: chips }); // 1 x 1.75

    expect(lineTotal(state.lines[0])).toBe(5);
    expect(cartTotal(state.lines)).toBe(6.75);
    expect(cartCount(state.lines)).toBe(3);
  });
});
