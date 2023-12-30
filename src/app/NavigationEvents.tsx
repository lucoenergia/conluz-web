"use client";

// ** React Import
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// ** Loader Import
import NProgress from "nprogress";

export function NavigationEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    NProgress.done();
    return () => {
      NProgress.start();
    };
  }, [pathname, searchParams]);

  return null;
}
