import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUnsavedChangesGuard } from "./useUnsavedChangesGuard";

function dispatchBeforeUnload(): BeforeUnloadEvent {
  const event = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
  window.dispatchEvent(event);
  return event;
}

describe("useUnsavedChangesGuard", () => {
  it("does not intercept beforeunload when there are no unsaved changes", () => {
    renderHook(() => useUnsavedChangesGuard(false));
    const event = dispatchBeforeUnload();
    expect(event.defaultPrevented).toBe(false);
  });

  it("prevents the default beforeunload behaviour while dirty", () => {
    renderHook(() => useUnsavedChangesGuard(true));
    const event = dispatchBeforeUnload();
    expect(event.defaultPrevented).toBe(true);
  });

  it("stops intercepting once isDirty flips back to false", () => {
    const { rerender } = renderHook(({ isDirty }) => useUnsavedChangesGuard(isDirty), {
      initialProps: { isDirty: true },
    });
    rerender({ isDirty: false });

    const event = dispatchBeforeUnload();
    expect(event.defaultPrevented).toBe(false);
  });

  it("removes the listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useUnsavedChangesGuard(true));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    removeSpy.mockRestore();
  });
});
