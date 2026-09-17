import "@testing-library/jest-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { type FC, type ReactNode } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../../theme";
import { ActiveCommunityContext } from "../../context/community.context";
import type { SupplyResponse } from "../../api/models";

const SUPPLIES_BY_COMMUNITY: Record<string, SupplyResponse[]> = {
  "community-a": [{ id: "supply-a", code: "CODE-A", name: "Supply A" } as SupplyResponse],
  "community-b": [{ id: "supply-b", code: "CODE-B", name: "Supply B" } as SupplyResponse],
};

vi.mock("../../api/supplies/supplies", () => ({
  useGetAllSupplies: (communityId: string) => ({
    data: { items: SUPPLIES_BY_COMMUNITY[communityId] ?? [] },
    isLoading: false,
  }),
}));

import { PlantForm } from "./PlantForm";

const handleSubmit = vi.fn();

/** Mirrors AuthenticatedLayout's keyed Outlet. */
const KeyedForm: FC<{ communityId: string }> = ({ communityId }) => (
  <ActiveCommunityContext.Provider value={communityId}>
    <PlantForm key={communityId} handleSubmit={handleSubmit} selectedSupplyCode="CODE-A" />
  </ActiveCommunityContext.Provider>
);

function renderForm(communityId: string) {
  const tree = (id: string): ReactNode => (
    <ThemeProvider theme={theme}>
      <KeyedForm communityId={id} />
    </ThemeProvider>
  );
  const { rerender } = render(tree(communityId));
  return { switchTo: (id: string) => rerender(tree(id)) };
}

describe("PlantForm across a community switch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // selectedSupply was only ever set, never cleared: after a switch the picker
  // listed community B's supplies while the form still held community A's
  // selection, and submitting wrote that foreign supplyCode.
  it("drops the previous community's selected supply", async () => {
    const { switchTo } = renderForm("community-a");
    await waitFor(() => {
      expect(screen.getByDisplayValue(/Supply A/)).toBeInTheDocument();
    });

    switchTo("community-b");

    await waitFor(() => {
      expect(screen.queryByDisplayValue(/Supply A/)).not.toBeInTheDocument();
    });
  });
});
