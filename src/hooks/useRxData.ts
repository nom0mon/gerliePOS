import { useEffect, useRef, useState } from 'react';
import { getDb } from '../db/rxdb';

/**
 * Reactive data hook that mirrors the shape of dexie-react-hooks' `useLiveQuery`
 * but is backed by RxDB. Pass an async querier (usually a repository call); it
 * runs once up front and re-runs whenever either collection emits a change, so
 * consumers re-render after any write — the same ergonomics the app relied on
 * with Dexie's live queries.
 *
 * Returns `undefined` until the first result resolves (loading sentinel), then
 * the latest value.
 */
export function useRxData<T>(
  querier: () => Promise<T>,
  deps: ReadonlyArray<unknown> = []
): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);
  // Keep the latest querier without forcing it into the deps array.
  const querierRef = useRef(querier);
  querierRef.current = querier;

  useEffect(() => {
    let active = true;
    const subs: Array<{ unsubscribe: () => void }> = [];

    const run = () => {
      void querierRef.current().then((v) => {
        if (active) setValue(v);
      });
    };

    void getDb().then((db) => {
      if (!active) return;
      run(); // initial load
      // RxDB collections expose a change stream via `.$`.
      subs.push(db.menuitems.$.subscribe(() => run()));
      subs.push(db.sales.$.subscribe(() => run()));
    });

    return () => {
      active = false;
      subs.forEach((s) => s.unsubscribe());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}
