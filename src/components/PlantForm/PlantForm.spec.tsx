import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { buildSupply, buildSupplyCapabilities } from "../../test/fixtures";

vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllSupplies: vi.fn(),
}));

import { getAllSupplies, useGetAllSupplies } from "../../api/supplies/supplies";
import { PlantForm } from "./PlantForm";

const COMMUNITY_ID = "community-a";

const supply = (id: string, code: string, canCreatePlant: boolean) =>
  buildSupply({
    id,
    code,
    name: null,
    community: { id: COMMUNITY_ID, name: "Sol Común" },
    capabilities: buildSupplyCapabilities({ canRead: true, canCreatePlant }),
  });

function setup(supplies: ReturnType<typeof supply>[], props: Partial<React.ComponentProps<typeof PlantForm>> = {}) {
  vi.mocked(useGetAllSupplies).mockReturnValue(
    query.success<typeof getAllSupplies>({
      items: supplies,
      size: 10000,
      totalElements: supplies.length,
      totalPages: 1,
      number: 0,
    }),
  );

  return renderWithProviders(<PlantForm handleSubmit={vi.fn()} {...props} />, { activeCommunityId: COMMUNITY_ID });
}

async function openSupplyPicker(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("combobox", { name: /Punto de suministro/ }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PlantForm's supply picker", () => {
  it("offers only the supplies the caller may build a plant on", async () => {
    const user = userEvent.setup();
    setup([supply("s1", "ES0001", true), supply("s2", "ES0002", false)]);

    await openSupplyPicker(user);

    expect(await screen.findByRole("option", { name: /ES0001/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /ES0002/ })).not.toBeInTheDocument();
  });

  it("offers nothing when the caller may build a plant on none of them", async () => {
    const user = userEvent.setup();
    setup([supply("s1", "ES0001", false), supply("s2", "ES0002", false)]);

    await openSupplyPicker(user);

    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  // Editing keeps the plant's existing supply, which the caller need not be
  // allowed to create another plant on: the selector is disabled there, and
  // filtering it would empty the field the form is meant to preserve.
  it("keeps every supply when the selector is disabled, as it is when editing", async () => {
    setup([supply("s1", "ES0001", false)], {
      disableSupplySelector: true,
      selectedSupplyCode: "ES0001",
      initialValues: { supplyCode: "ES0001" },
    });

    expect(await screen.findByDisplayValue(/ES0001/)).toBeInTheDocument();
  });

  it("blocks the submit when the caller was not handed the action", () => {
    setup([supply("s1", "ES0001", true)], { disabled: true });

    expect(screen.getByRole("button", { name: "Crear planta" })).toBeDisabled();
  });

  it("offers the submit once the caller was handed the action", () => {
    setup([supply("s1", "ES0001", true)], { disabled: false });

    expect(screen.getByRole("button", { name: "Crear planta" })).not.toBeDisabled();
  });
});
