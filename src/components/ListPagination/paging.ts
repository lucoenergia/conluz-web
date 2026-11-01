/** The rows of one page of a records list (UI-LST-005). */
export const LIST_PAGE_SIZE = 25;

/** How many pages `count` rows fill; one when there are none. */
export function pageCountOf(count: number, pageSize = LIST_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(count / pageSize));
}

/** The rows of a 1-based page, clamped to the last one. */
export function pageOf<T>(rows: T[], page: number, pageSize = LIST_PAGE_SIZE): T[] {
  const current = Math.min(Math.max(1, page), pageCountOf(rows.length, pageSize));
  return rows.slice((current - 1) * pageSize, current * pageSize);
}
