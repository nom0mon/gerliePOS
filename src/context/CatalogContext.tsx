import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Product } from '../types';
import { productRepo, type NewProduct } from '../repositories/productRepo';

interface CatalogContextValue {
  /** Reactive list of products, ordered by name. undefined while first loading. */
  products: Product[] | undefined;
  loading: boolean;
  addProduct: (input: NewProduct) => Promise<number>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  // useLiveQuery re-runs whenever the underlying products table changes, so any
  // write (here or from a completed sale) re-renders consumers automatically.
  const products = useLiveQuery(() => productRepo.list(), []);

  const addProduct = useCallback(
    (input: NewProduct) => productRepo.add(input),
    []
  );

  const value = useMemo<CatalogContextValue>(
    () => ({
      products,
      loading: products === undefined,
      addProduct,
    }),
    [products, addProduct]
  );

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    throw new Error('useCatalog must be used within a CatalogProvider');
  }
  return ctx;
}
