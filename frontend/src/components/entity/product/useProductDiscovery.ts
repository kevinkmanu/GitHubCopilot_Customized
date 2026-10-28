import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DEFAULT_FILTERS,
  MAX_SEARCH_LENGTH,
  buildParams,
  parseFilters,
  sameFilterParams,
  sameFilters,
  type DiscoveryFilters,
  type SortKey,
} from './productDiscovery';

const SEARCH_DEBOUNCE_MS = 250;

// Filters live in local state so results update instantly; the URL mirrors them and drives back/forward.
export function useProductDiscovery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchString = searchParams.toString();
  const [filters, setFilters] = useState<DiscoveryFilters>(() => parseFilters(searchParams));
  const latest = useRef({ searchString, setSearchParams });
  const lastWritten = useRef<string | null>(null);
  const pushNext = useRef(false);

  useEffect(() => {
    latest.current = { searchString, setSearchParams };
  });

  // URL -> state, for back/forward and external navigation (our own writes are skipped).
  useEffect(() => {
    if (lastWritten.current === searchString) {
      lastWritten.current = null;
      return;
    }
    const fromUrl = parseFilters(new URLSearchParams(searchString));
    setFilters(prev => (sameFilters(prev, fromUrl) ? prev : fromUrl));
  }, [searchString]);

  // State -> URL; also normalizes invalid parameters found on load.
  useEffect(() => {
    const current = new URLSearchParams(latest.current.searchString);
    const next = buildParams(current, filters);
    if (sameFilterParams(current, next)) {
      pushNext.current = false;
      return;
    }
    const delay = filters.search.trim() !== (current.get('q') ?? '') ? SEARCH_DEBOUNCE_MS : 0;
    const timer = setTimeout(() => {
      const push = pushNext.current;
      pushNext.current = false;
      lastWritten.current = next.toString();
      latest.current.setSearchParams(next, { replace: !push });
    }, delay);
    return () => clearTimeout(timer);
  }, [filters]);

  const update = useCallback((patch: Partial<DiscoveryFilters>, push: boolean) => {
    pushNext.current = push;
    setFilters(prev => ({ ...prev, ...patch }));
  }, []);

  return {
    filters,
    setSearch: (search: string) => update({ search: search.slice(0, MAX_SEARCH_LENGTH) }, false),
    setMin: (min: string) => update({ min }, false),
    setMax: (max: string) => update({ max }, false),
    setSale: (sale: boolean) => update({ sale }, true),
    setSort: (sort: SortKey) => update({ sort }, true),
    reset: () => update(DEFAULT_FILTERS, true),
  };
}
