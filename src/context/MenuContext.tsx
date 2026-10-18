import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useRxData } from '../hooks/useRxData';
import type { MenuItem } from '../types';
import { menuRepo, type NewMenuItem } from '../repositories/menuRepo';
import { stockRepo } from '../repositories/stockRepo';

interface MenuContextValue {
  /** Reactive list of all menu items, ordered by category then name. */
  items: MenuItem[] | undefined;
  /** Distinct categories present in the menu, in display order. */
  categories: string[];
  loading: boolean;
  addItem: (input: NewMenuItem) => Promise<string>;
  updateItem: (
    id: string,
    changes: Partial<Omit<MenuItem, 'id'>>
  ) => Promise<number>;
  setAvailable: (id: string, available: boolean) => Promise<number>;
  removeItem: (id: string) => Promise<void>;
  resetToDefault: () => Promise<number>;
  /** Enable/disable stock tracking and set opening quantity + low threshold. */
  configureStock: (
    id: string,
    opts: { trackStock: boolean; stockQty?: number; lowStockThreshold?: number }
  ) => Promise<number>;
  /** Set an absolute quantity for a tracked item (restock/correction). */
  setStock: (id: string, qty: number) => Promise<number>;
}

const MenuContext = createContext<MenuContextValue | null>(null);

export function MenuProvider({ children }: { children: ReactNode }) {
  // Reactive: re-runs whenever the menuItems collection changes.
  const items = useRxData(() => menuRepo.list(), []);

  const categories = useMemo(() => {
    if (!items) return [];
    const seen: string[] = [];
    for (const i of items) if (!seen.includes(i.category)) seen.push(i.category);
    return seen;
  }, [items]);

  const addItem = useCallback((input: NewMenuItem) => menuRepo.add(input), []);
  const updateItem = useCallback(
    (id: string, changes: Partial<Omit<MenuItem, 'id'>>) =>
      menuRepo.update(id, changes),
    []
  );
  const setAvailable = useCallback(
    (id: string, available: boolean) => menuRepo.setAvailable(id, available),
    []
  );
  const removeItem = useCallback((id: string) => menuRepo.remove(id), []);
  const resetToDefault = useCallback(() => menuRepo.resetToDefault(), []);
  const configureStock = useCallback(
    (
      id: string,
      opts: {
        trackStock: boolean;
        stockQty?: number;
        lowStockThreshold?: number;
      }
    ) => stockRepo.configure(id, opts),
    []
  );
  const setStock = useCallback(
    (id: string, qty: number) => stockRepo.setQuantity(id, qty),
    []
  );

  const value = useMemo<MenuContextValue>(
    () => ({
      items,
      categories,
      loading: items === undefined,
      addItem,
      updateItem,
      setAvailable,
      removeItem,
      resetToDefault,
      configureStock,
      setStock,
    }),
    [
      items,
      categories,
      addItem,
      updateItem,
      setAvailable,
      removeItem,
      resetToDefault,
      configureStock,
      setStock,
    ]
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMenu(): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return ctx;
}
