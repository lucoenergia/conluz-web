import "@testing-library/jest-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { type FC } from "react";
import type { SupplyResponse } from "../../api/models";
import { renderWithProviders } from "../../test/renderWithProviders";

const SUPPLIES_BY_COMMUNITY: Record<string, SupplyResponse[]> = {
  "community-a": [{ id: "supply-a", code: "CODE-A", name: "Supply A" } as SupplyResponse],
  "community-b": [{ id: "supply-b", code: "CODE-B", name: "Supply B" } as SupplyResponse],
};

let resolveNextFetch: (() => void) | null = null;

vi.mock(import("../../api/supplies/supplies"), () => ({
  getAllSupplies: async (communityId: string) => {
    if (resolveNextFetch) {
      await new Promise<void>((resolve) => {
        resolveNextFetch = resolve;
      });
    }
    return { items: SUPPLIES_BY_COMMUNITY[communityId] ?? [], number: 0, totalPages: 1 };
  },
}));

import { useCommunitySuppliesCatalogue } from "./useCommunitySuppliesCatalogue";

/**
 * This catalogue lives outside React Query -- a manual paginating fetch loop
 * with its results in useState -- so queryClient.invalidateQueries() cannot
 * reach it. Nothing but a remount clears it.
 */
const Harness: FC<{ communityId: string }> = ({ communityId }) => {
  const { supplies, isLoading } = useCommunitySuppliesCatalogue(communityId, true);
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="codes">{supplies.map((s) => s.code).join(",")}</span>
    </div>
  );
};

const Keyed: FC<{ communityId: string }> = ({ communityId }) => (
  <Harness key={communityId} communityId={communityId} />
);

function renderCatalogue(communityId: string) {
  const { rerender } = renderWithProviders(<Keyed communityId={communityId} />);
  return { switchTo: (id: string) => rerender(<Keyed communityId={id} />) };
}

describe("useCommunitySuppliesCatalogue across a community switch", () => {
  beforeEach(() => {
    resolveNextFetch = null;
  });

  it("never shows the previous community's catalogue", async () => {
    const { switchTo } = renderCatalogue("community-a");
    await waitFor(() => expect(screen.getByTestId("codes")).toHaveTextContent("CODE-A"));

    switchTo("community-b");

    // Decisive: at no point between the switch and the new data arriving may
    // community A's codes still be on screen.
    expect(screen.getByTestId("codes").textContent).toBe("");
    await waitFor(() => expect(screen.getByTestId("codes")).toHaveTextContent("CODE-B"));
  });
});
