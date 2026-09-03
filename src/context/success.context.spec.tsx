import "@testing-library/jest-dom";
import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { SuccessProvider, useSuccess, useSuccessDispatch } from "./success.context";

function wrapper({ children }: { children: ReactNode }) {
  return <SuccessProvider>{children}</SuccessProvider>;
}

describe("success.context", () => {
  it("throws when useSuccessDispatch is used outside a SuccessProvider", () => {
    const { result } = renderHook(() => {
      try {
        return useSuccessDispatch();
      } catch (error) {
        return error;
      }
    });
    expect(result.current).toBeInstanceOf(Error);
  });

  it("adds a dispatched message to the list and auto-removes it after 5 seconds", () => {
    vi.useFakeTimers();
    const { result } = renderHook(
      () => ({ messages: useSuccess(), dispatch: useSuccessDispatch() }),
      { wrapper },
    );

    act(() => {
      result.current.dispatch("Acuerdo de reparto eliminado correctamente");
    });
    expect(result.current.messages).toEqual(["Acuerdo de reparto eliminado correctamente"]);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.messages).toEqual([]);

    vi.useRealTimers();
  });
});
