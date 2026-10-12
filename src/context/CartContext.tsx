import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  useCallback,
  type ReactNode,
} from 'react';
import type { Product } from '../types';

/** A product plus the quantity currently in the cart. */
export interface CartLine {
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  /** Stock available at the time the line was added — used to cap quantity. */
  stockAvailable: number;
}

interface CartState {
  lines: CartLine[];
}

type CartAction =
  | { type: 'ADD'; product: Product }
  | { type: 'SET_QTY'; productId: number; quantity: number }
  | { type: 'REMOVE'; productId: number }
  | { type: 'CLEAR' };

const initialState: CartState = { lines: [] };

/**
 * Pure cart reducer. Keeping this exported makes the quantity/total rules
 * directly unit-testable without rendering any component.
 */
export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD': {
      const { product } = action;
      if (product.id == null || product.stockQuantity <= 0) return state;

      const existing = state.lines.find((l) => l.productId === product.id);
      if (existing) {
        // Do not exceed available stock.
        if (existing.quantity >= existing.stockAvailable) return state;
        return {
          lines: state.lines.map((l) =>
            l.productId === product.id
              ? { ...l, quantity: l.quantity + 1 }
              : l
          ),
        };
      }

      return {
        lines: [
          ...state.lines,
          {
            productId: product.id,
            name: product.name,
            unitPrice: product.price,
            quantity: 1,
            stockAvailable: product.stockQuantity,
          },
        ],
      };
    }

    case 'SET_QTY': {
      const { productId, quantity } = action;
      if (quantity <= 0) {
        return { lines: state.lines.filter((l) => l.productId !== productId) };
      }
      return {
        lines: state.lines.map((l) =>
          l.productId === productId
            ? { ...l, quantity: Math.min(quantity, l.stockAvailable) }
            : l
        ),
      };
    }

    case 'REMOVE':
      return {
        lines: state.lines.filter((l) => l.productId !== action.productId),
      };

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
  addItem: (product: Product) => void;
  setQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const addItem = useCallback(
    (product: Product) => dispatch({ type: 'ADD', product }),
    []
  );
  const setQuantity = useCallback(
    (productId: number, quantity: number) =>
      dispatch({ type: 'SET_QTY', productId, quantity }),
    []
  );
  const removeItem = useCallback(
    (productId: number) => dispatch({ type: 'REMOVE', productId }),
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
