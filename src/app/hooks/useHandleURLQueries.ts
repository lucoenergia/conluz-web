// ** Types
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Check for URL queries as well for matching
 * Current URL & Item Path
 *
 * @param item
 * @param activeItem
 */
export const useHandleURLQueries = (path: string | undefined): boolean => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (searchParams.keys.length && path) {
    const arr: string[] = Array.from(searchParams.keys());

    return (
      pathname.includes(path) &&
      searchParams.has(searchParams.get(arr[0]) as string) &&
      path !== "/"
    );
  }

  return false;
};
