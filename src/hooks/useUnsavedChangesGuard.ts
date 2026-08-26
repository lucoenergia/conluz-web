import { useEffect } from "react";

/**
 * Prompts before tab close, refresh, or a typed URL while `isDirty` is true.
 *
 * Deliberately does NOT guard in-app navigation (breadcrumb, sidebar, back
 * button) — that needs React Router's useBlocker, which requires a data
 * router, and this app boots a plain <BrowserRouter>. Migrating the router
 * is a separate, app-wide change out of scope here; once it lands, this is
 * the hook to extend with useBlocker.
 */
export function useUnsavedChangesGuard(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Chrome requires returnValue to be set for the native prompt to show.
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);
}
