import { describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { GraphBar } from "./GraphBar";

vi.mock("react-apexcharts", () => ({ default: () => null }));

describe("GraphBar", () => {
  it("cancels a pending re-render when it unmounts", () => {
    vi.useFakeTimers();
    try {
      const { unmount } = renderWithProviders(
        <GraphBar title="Producción" categories={["Ene"]} data={[1]} variant="production" />,
      );
      // The harness's providers keep timers of their own, so the resize's is
      // picked out by its delay rather than by counting every timer.
      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });
      const rerender = setTimeoutSpy.mock.results[setTimeoutSpy.mock.calls.findIndex(([, delay]) => delay === 300)];
      expect(rerender).toBeDefined();
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

      unmount();

      // By identity: the fake timer handle does not compare by value.
      expect(clearTimeoutSpy.mock.calls.map(([handle]) => handle)).toContain(rerender.value);
    } finally {
      vi.restoreAllMocks();
      vi.useRealTimers();
    }
  });
});
