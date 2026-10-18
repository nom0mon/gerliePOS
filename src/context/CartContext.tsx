import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  useCallback,
  type ReactNode,
} from 'react';
import type { MenuItem, SelectedModifier } from '../types';

/**
 * A line in the cart: one menu item with a specific set of chosen modifiers,
 * plus a quantity. Two taps of the same item with *different* modifiers produce
 * two separate lines; identical selections stack onto one line.
 */
export interface CartLine {
  /** Stable identity for this item+modifier combination (see lineKey). */
  key: string;
  menuItemId: string;
  name: string;
  basePrice: number;
  selectedModifiers: SelectedModifier[];
  /** basePrice + sum of modifier priceDeltas. */
  unitPrice: number;
  quantity: number;
}

/**
 * Build a stable key for an item + its selected modifiers so identical
 * selections collapse to one cart line. Options are sorted so order of
 * selection does not matter.
 */
export function lineKey(
  menuItemId: string,
  selected: SelectedModifier[]
): string {
  const mods = selected
    .map((m) => `${m.groupName}:${m.optionName}`)
    .sort()
    .join('|');
  return `${menuItemId}#${mods}`;
}

/** Unit price = base + every selected modifier's delta. */
export function computeUnitPrice(
  basePrice: number,
  selected: SelectedModifier[]
): number {
  const delta = selected.reduce((sum, m) => sum + m.priceDelta, 0);
  return +(basePrice + delta).toFixed(2);
}

/** A request to add a configured item to the cart. */
export interface AddToCartInput {
  item: MenuItem;
  selectedModifiers: SelectedModifier[];
}

interface CartState {
  lines: CartLine[];
}

type CartAction =
  | { type: 'ADD'; input: AddToCartInput }
  | { type: 'SET_QTY'; key: string; quantity: number }
  | { type: 'REMOVE'; key: string }
  | { type: 'CLEAR' };

const initialState: CartState = { lines: [] };

/**
 * Pure cart reducer. Exported so the quantity/stacking/total rules are directly
 * unit-testable without rendering any component.
 */
export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD': {
      const { item, selectedModifiers } = action.input;
      if (item.id == null) return state;

      const key = lineKey(item.id, selectedModifiers);
      const existing = state.lines.find((l) => l.key === key);
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.key === key ? { ...l, quantity: l.quantity + 1 } : l
          ),
        };
      }

      return {
        lines: [
          ...state.lines,
          {
            key,
            menuItemId: item.id,
            name: item.name,
            basePrice: item.basePrice,
            selectedModifiers,
            unitPrice: computeUnitPrice(item.basePrice, selectedModifiers),
            quantity: 1,
          },
        ],
      };
    }

    case 'SET_QTY': {
      const { key, quantity } = action;
      if (quantity <= 0) {
        return { lines: state.lines.filter((l) => l.key !== key) };
      }
      return {
        lines: state.lines.map((l) =>
          l.key === key ? { ...l, quantity } : l
        ),
      };
    }

    case 'REMOVE':
      return { lines: state.lines.filter((l) => l.key !== action.key) };

    case 'CLEAR':
      return initialState;

    default:
      return state;
  }
}

export function lineTotal(line: CartLine): number {
  return +(line.unitPrice * line.quantity).toFixed(2);
}

export function cartTotal(lines: CartLine[]): number {
  return +lines.reduce((sum, l) => sum + lineTotal(l), 0).toFixed(2);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

interface CartContextValue {
  lines: CartLine[];
  total: number;
  count: number;
  isEmpty: boolean;
  addItem: (input: AddToCartInput) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const addItem = useCallback(
    (input: AddToCartInput) => dispatch({ type: 'ADD', input }),
    []
  );
  const setQuantity = useCallback(
    (key: string, quantity: number) =>
      dispatch({ type: 'SET_QTY', key, quantity }),
    []
  );
  const removeItem = useCallback(
    (key: string) => dispatch({ type: 'REMOVE', key }),
    []
  );
  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines: state.lines,
      total: cartTotal(state.lines),
      count: cartCount(state.lines),
      isEmpty: state.lines.length === 0,
      addItem,
      setQuantity,
      removeItem,
      clear,
    }),
    [state.lines, addItem, setQuantity, removeItem, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
