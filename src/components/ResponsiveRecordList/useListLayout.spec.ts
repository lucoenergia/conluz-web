import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useListLayout } from "./useListLayout";

const originalWidth = window.innerWidth;
const setViewportWidth = (width: number) =>
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });

afterEach(() => setViewportWidth(originalWidth));

describe("useListLayout", () => {
  it("UI-LST-001 is narrow at a 1023px viewport", () => {
    setViewportWidth(1023);

    expect(renderHook(() => useListLayout()).result.current).toBe("narrow");
  });

  it("UI-LST-001 is wide from a 1024px viewport", () => {
    setViewportWidth(1024);

    expect(renderHook(() => useListLayout()).result.current).toBe("wide");
  });

  it("UI-LST-001 follows the viewport as it is resized", () => {
    setViewportWidth(1440);
    const { result } = renderHook(() => useListLayout());
    expect(result.current).toBe("wide");

    act(() => {
      setViewportWidth(390);
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current).toBe("narrow");
  });
});
