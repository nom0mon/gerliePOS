import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { PaymentType } from '../types';
import { saleRepo, type SaleLineInput } from '../repositories/saleRepo';
import { useCart } from './CartContext';

interface SalesContextValue {
  /**
   * Persist the current cart as a completed sale with the given payment type.
   * Clears the cart on success and returns the new sale id. Throws (e.g.
   * EmptySaleError) on failure, leaving the cart intact.
   */
  completeSale: (paymentType: PaymentType) => Promise<string>;
}

const SalesContext = createContext<SalesContextValue | null>(null);

export function SalesProvider({ children }: { children: ReactNode }) {
  const { lines, clear } = useCart();

  const completeSale = useCallback(
    async (paymentType: PaymentType = PaymentType.CASH) => {
      const input: SaleLineInput[] = lines.map((l) => ({
        menuItemId: l.menuItemId,
        name: l.name,
        basePrice: l.basePrice,
        selectedModifiers: l.selectedModifiers,
        unitPrice: l.unitPrice,
        quantity: l.quantity,
      }));
      const saleId = await saleRepo.completeSale(input, paymentType);
      clear();
      return saleId;
    },
    [lines, clear]
  );

  const value = useMemo<SalesContextValue>(
    () => ({ completeSale }),
    [completeSale]
  );

  return (
    <SalesContext.Provider value={value}>{children}</SalesContext.Provider>
  );
}

export function useSales(): SalesContextValue {
  const ctx = useContext(SalesContext);
  if (!ctx) {
    throw new Error('useSales must be used within a SalesProvider');
  }
  return ctx;
}
