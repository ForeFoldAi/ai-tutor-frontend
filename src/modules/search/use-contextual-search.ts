import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { globalSearch, searchEntity, type SearchEntity } from "@/api/search";
import { useDebouncedValue } from "@/modules/search/use-debounced-value";

export function useGlobalSearch(query: string, enabled = true) {
  const debounced = useDebouncedValue(query.trim(), 300);
  const active = enabled && debounced.length > 0;

  const result = useQuery({
    queryKey: ["search", "global", debounced],
    queryFn: () => globalSearch(debounced),
    enabled: active,
    placeholderData: keepPreviousData,
  });

  return {
    debouncedQuery: debounced,
    hits: result.data?.hits ?? [],
    // Initial load only — keep prior hits visible while refetching / typing.
    isLoading: active && result.isLoading && !result.data,
    isError: result.isError,
    error: result.error,
    open: active,
  };
}

export function useEntitySearch<T = Record<string, unknown>>(
  entity: SearchEntity,
  query: string,
  enabled = true,
) {
  const debounced = useDebouncedValue(query.trim(), 300);
  const active = enabled && debounced.length > 0;

  const result = useQuery({
    queryKey: ["search", "entity", entity, debounced],
    queryFn: () => searchEntity<T>(entity, debounced),
    enabled: active,
    placeholderData: keepPreviousData,
  });

  return {
    debouncedQuery: debounced,
    searching: active,
    items: result.data?.items ?? [],
    total: result.data?.total ?? 0,
    // Skeleton only when there is no data yet (not on background refetch).
    isLoading: active && result.isLoading && !result.data,
    isError: result.isError,
    error: result.error,
    refetch: result.refetch,
  };
}
