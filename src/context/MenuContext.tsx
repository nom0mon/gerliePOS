import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { MenuItem } from '../types';
import { menuRepo, type NewMenuItem } from '../repositories/menuRepo';

interface MenuContextValue {
  /** Reactive list of all menu items, ordered by category then name. */
  items: MenuItem[] | undefined;
  /** Distinct categories present in the menu, in display order. */
  categories: string[];
  loading: boolean;
  addItem: (input: NewMenuItem) => Promise<number>;
  updateItem: (
    id: number,
    changes: Partial<Omit<MenuItem, 'id'>>
  ) => Promise<number>;
  setAvailable: (id: number, available: boolean) => Promise<number>;
  removeItem: (id: number) => Promise<void>;
  resetToDefault: () => Promise<number>;
}

const MenuContext = createContext<MenuContextValue | null>(null);

export function MenuProvider({ children }: { children: ReactNode }) {
  // useLiveQuery re-runs whenever the menuItems table changes, so any write
  // re-renders consumers automatically.
  const items = useLiveQuery(() => menuRepo.list(), []);

  const categories = useMemo(() => {
    if (!items) return [];
    const seen: string[] = [];
    for (const i of items) if (!seen.includes(i.category)) seen.push(i.category);
    return seen;
  }, [items]);

  const addItem = useCallback((input: NewMenuItem) => menuRepo.add(input), []);
  const updateItem = useCallback(
    (id: number, changes: Partial<Omit<MenuItem, 'id'>>) =>
      menuRepo.update(id, changes),
    []
  );
  const setAvailable = useCallback(
    (id: number, available: boolean) => menuRepo.setAvailable(id, available),
    []
  );
  const removeItem = useCallback((id: number) => menuRepo.remove(id), []);
  const resetToDefault = useCallback(() => menuRepo.resetToDefault(), []);

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
    }),
    [items, categories, addItem, updateItem, setAvailable, removeItem, resetToDefault]
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
