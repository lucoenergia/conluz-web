import type { QueryClient, QueryKey } from "@tanstack/react-query";

/**
 * Writes the `enabled` an enable or disable just stored into the cached
 * configuration, ahead of the refetch the caller then asks for.
 *
 * The configuration form sends the stored `enabled` on every edit and reads it
 * from this cache. Between a successful toggle and the refetch landing, the
 * cache would still hold the old value, so a save in that window would undo the
 * toggle, and an undone disable would turn the integration back on without the
 * backend's completeness check (#256). With no cached configuration there is
 * nothing to correct, so nothing is written.
 */
export function writeStoredEnabled(queryClient: QueryClient, queryKey: QueryKey, enabled: boolean): void {
  queryClient.setQueryData(queryKey, (stored: unknown) =>
    stored && typeof stored === "object" ? { ...stored, enabled } : undefined,
  );
}
