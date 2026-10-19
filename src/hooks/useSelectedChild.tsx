import { useQuery } from 'convex/react';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';

type SelectedChild = {
  /** All children the user can see. `undefined` while loading. */
  children: Doc<'children'>[] | undefined;
  /** The selected child, defaulting to the first. `undefined` while loading or if there are none. */
  child: Doc<'children'> | undefined;
  selectChild: (id: Id<'children'>) => void;
};

const SelectedChildContext = createContext<SelectedChild | null>(null);

type Props = {
  /** Skip the query until the user is stored and has a household. */
  enabled: boolean;
  children: ReactNode;
};

/** Holds which child the app is showing. Selection lasts for the session. */
export function SelectedChildProvider({ enabled, children: content }: Props) {
  const children = useQuery(api.children.list, enabled ? {} : 'skip');
  const [selectedId, setSelectedId] = useState<Id<'children'>>();

  const value = useMemo<SelectedChild>(() => {
    // Fall back to the first child if nothing is selected yet, or the
    // selected child is gone (e.g. removed from the household).
    const child = children?.find((c) => c._id === selectedId) ?? children?.[0];
    return { children, child, selectChild: setSelectedId };
  }, [children, selectedId]);

  return <SelectedChildContext.Provider value={value}>{content}</SelectedChildContext.Provider>;
}

export function useSelectedChild(): SelectedChild {
  const value = useContext(SelectedChildContext);
  if (!value) throw new Error('useSelectedChild must be used inside SelectedChildProvider');
  return value;
}
