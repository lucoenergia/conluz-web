import { describe, expect, it, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { buildSupply } from "../../test/fixtures";
import { getAllSupplies } from "../../api/supplies/supplies";
import { useCommunitySuppliesCatalogue } from "./useCommunitySuppliesCatalogue";

vi.mock(import("../../api/supplies/supplies"), () => ({
  getAllSupplies: vi.fn(),
}));

const mockGetAllSupplies = vi.mocked(getAllSupplies);

describe("useCommunitySuppliesCatalogue", () => {
  beforeEach(() => {
    mockGetAllSupplies.mockReset();
  });

  it("does not fetch when disabled", () => {
    renderHookWithProviders(() => useCommunitySuppliesCatalogue("community-1", false));
    expect(mockGetAllSupplies).not.toHaveBeenCalled();
  });

  it("does not fetch when there is no active community", () => {
    renderHookWithProviders(() => useCommunitySuppliesCatalogue(null, true));
    expect(mockGetAllSupplies).not.toHaveBeenCalled();
  });

  it("fetches exactly one page for a community whose whole catalogue fits in one page", async () => {
    mockGetAllSupplies.mockResolvedValue({
      items: Array.from({ length: 20 }, (_, i) => buildSupply({ id: `s${i}` })),
      number: 0,
      totalPages: 1,
    });

    const { result } = renderHookWithProviders(() => useCommunitySuppliesCatalogue("community-1", true));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetAllSupplies).toHaveBeenCalledTimes(1);
    expect(mockGetAllSupplies).toHaveBeenCalledWith("community-1", { page: 0, size: 200 });
    expect(result.current.supplies).toHaveLength(20);
  });

  it("pages until the last page and accumulates every item", async () => {
    mockGetAllSupplies
      .mockResolvedValueOnce({ items: [buildSupply({ id: "a" })], number: 0, totalPages: 2 })
      .mockResolvedValueOnce({ items: [buildSupply({ id: "b" })], number: 1, totalPages: 2 });

    const { result } = renderHookWithProviders(() => useCommunitySuppliesCatalogue("community-1", true));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetAllSupplies).toHaveBeenCalledTimes(2);
    expect(result.current.supplies.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("terminates instead of hanging when number/totalPages come back undefined, by stopping on empty items", async () => {
    mockGetAllSupplies
      .mockResolvedValueOnce({ items: [buildSupply({ id: "a" })] }) // number and totalPages both undefined
      .mockResolvedValueOnce({ items: [] });

    const { result } = renderHookWithProviders(() => useCommunitySuppliesCatalogue("community-1", true));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetAllSupplies).toHaveBeenCalledTimes(2);
    expect(result.current.supplies).toHaveLength(1);
  });

  it("terminates via the hard iteration cap if a malformed response never reports empty items or a final page", async () => {
    mockGetAllSupplies.mockResolvedValue({ items: [buildSupply({ id: "x" })] }); // always one item, never empty, never last page

    const { result } = renderHookWithProviders(() => useCommunitySuppliesCatalogue("community-1", true));

    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 });
    expect(mockGetAllSupplies.mock.calls.length).toBeLessThanOrEqual(50);
    expect(result.current.supplies.length).toBeLessThanOrEqual(50);
  });

  it("surfaces a fetch error without throwing", async () => {
    mockGetAllSupplies.mockRejectedValue(new Error("network error"));

    const { result } = renderHookWithProviders(() => useCommunitySuppliesCatalogue("community-1", true));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
