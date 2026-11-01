import { useState } from "react";
import { LIST_PAGE_SIZE, pageCountOf, pageOf } from "./paging";

/**
 * The page of `rows` a list shows. The page is clamped on every render, so a
 * write that shrinks the list under the page shown lands on its last page.
 */
export function useListPage<T>(rows: T[], pageSize = LIST_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const pageCount = pageCountOf(rows.length, pageSize);
  const current = Math.min(page, pageCount);
  return { page: current, setPage, pageCount, pageRows: pageOf(rows, current, pageSize) };
}
