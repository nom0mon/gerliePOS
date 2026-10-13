import { describe, it, expect } from 'vitest';
import {
  cartReducer,
  cartTotal,
  cartCount,
  lineTotal,
  lineKey,
  computeUnitPrice,
  type CartLine,
} from './CartContext';
import type { MenuItem, SelectedModifier } from '../types';

const coffee: MenuItem = {
  id: 1,
  name: 'Iced Coffee',
  category: 'Drinks',
  basePrice: 59,
  available: true,
  modifierGroups: [],
};

const fries: MenuItem = {
  id: 2,
  name: 'Fries',
  category: 'Snacks',
  basePrice: 40,
  available: true,
  modifierGroups: [],
};

const large: SelectedModifier = {
  groupName: 'Size',
  optionName: 'Large',
  priceDelta: 20,
};
const pearls: SelectedModifier = {
  groupName: 'Add-ons',
  optionName: 'Pearls',
  priceDelta: 15,
};

const empty = { lines: [] as CartLine[] };

describe('lineKey', () => {
  it('is identical regardless of modifier order', () => {
    expect(lineKey(1, [large, pearls])).toBe(lineKey(1, [pearls, large]));
  });

  it('differs when modifiers differ', () => {
    expect(lineKey(1, [large])).not.toBe(lineKey(1, [pearls]));
  });

  it('differs when the item differs', () => {
    expect(lineKey(1, [large])).not.toBe(lineKey(2, [large]));
  });
});

describe('computeUnitPrice', () => {
  it('adds every modifier delta to the base price', () => {
    expect(computeUnitPrice(59, [large, pearls])).toBe(94); // 59 + 20 + 15
  });

  it('returns the base price when there are no modifiers', () => {
    expect(computeUnitPrice(40, [])).toBe(40);
  });
});

describe('cartReducer', () => {
  it('adds a new item as a line with quantity 1 and computed unit price', () => {
    const state = cartReducer(empty, {
      type: 'ADD',
      input: { item: coffee, selectedModifiers: [large] },
    });
    expect(state.lines).toHaveLength(1);
    expect(state.lines[0]).toMatchObject({
      menuItemId: 1,
      name: 'Iced Coffee',
      basePrice: 59,
      unitPrice: 79, // 59 + 20
      quantity: 1,
    });
  });

  it('stacks identical item+modifier selections onto one line', () => {
    let state = cartReducer(empty, {
      type: 'ADD',
      input: { item: coffee, selectedModifiers: [large] },
    });
    state = cartReducer(state, {
      type: 'ADD',
      input: { item: coffee, selectedModifiers: [large] },
    });
    expect(state.lines).toHaveLength(1);
    expect(state.lines[0].quantity).toBe(2);
  });

  it('keeps different modifier selections as separate lines', () => {
    let state = cartReducer(empty, {
      type: 'ADD',
      input: { item: coffee, selectedModifiers: [large] },
    });
    state = cartReducer(state, {
      type: 'ADD',
      input: { item: coffee, selectedModifiers: [] },
    });
    expect(state.lines).toHaveLength(2);
  });

  it('sets an exact quantity (no stock cap)', () => {
    let state = cartReducer(empty, {
      type: 'ADD',
      input: { item: coffee, selectedModifiers: [] },
    });
    const key = state.lines[0].key;
    state = cartReducer(state, { type: 'SET_QTY', key, quantity: 99 });
    expect(state.lines[0].quantity).toBe(99);
  });

  it('removes a line when quantity set to 0 or below', () => {
    let state = cartReducer(empty, {
      type: 'ADD',
      input: { item: coffee, selectedModifiers: [] },
    });
    const key = state.lines[0].key;
    state = cartReducer(state, { type: 'SET_QTY', key, quantity: 0 });
    expect(state.lines).toHaveLength(0);
  });

  it('removes a specific line by key', () => {
    let state = cartReducer(empty, {
      type: 'ADD',
      input: { item: coffee, selectedModifiers: [] },
    });
    state = cartReducer(state, {
      type: 'ADD',
      input: { item: fries, selectedModifiers: [] },
    });
    const coffeeKey = state.lines[0].key;
    state = cartReducer(state, { type: 'REMOVE', key: coffeeKey });
    expect(state.lines.map((l) => l.menuItemId)).toEqual([2]);
  });

  it('clears the cart', () => {
    let state = cartReducer(empty, {
      type: 'ADD',
      input: { item: coffee, selectedModifiers: [] },
    });
    state = cartReducer(state, {
      type: 'ADD',
      input: { item: fries, selectedModifiers: [] },
    });
    state = cartReducer(state, { type: 'CLEAR' });
    expect(state.lines).toHaveLength(0);
  });
});

describe('cart totals', () => {
  it('computes line and cart totals including modifiers', () => {
    let state = cartReducer(empty, {
      type: 'ADD',
      input: { item: coffee, selectedModifiers: [large] }, // 79
    });
    state = cartReducer(state, {
      type: 'ADD',
      input: { item: coffee, selectedModifiers: [large] }, // -> qty 2, 158
    });
    state = cartReducer(state, {
      type: 'ADD',
      input: { item: fries, selectedModifiers: [] }, // 40
    });

    expect(lineTotal(state.lines[0])).toBe(158);
    expect(cartTotal(state.lines)).toBe(198);
    expect(cartCount(state.lines)).toBe(3);
  });
});
