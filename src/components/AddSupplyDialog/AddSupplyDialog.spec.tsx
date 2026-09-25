import "@testing-library/jest-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { buildSupply } from "../../test/fixtures";
import { getAllSupplies } from "../../api/supplies/supplies";
import { AddSupplyDialog } from "./AddSupplyDialog";

vi.mock(import("../../api/supplies/supplies"), () => ({
  getAllSupplies: vi.fn(),
}));

const mockGetAllSupplies = vi.mocked(getAllSupplies);

function renderDialog(props: Partial<React.ComponentProps<typeof AddSupplyDialog>> = {}) {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();
  const utils = renderWithProviders(
    <AddSupplyDialog
      isOpen
      communityId="community-1"
      alreadyAddedSupplyIds={new Set()}
      onCancel={onCancel}
      onConfirm={onConfirm}
      {...props}
    />,
  );
  return { ...utils, onCancel, onConfirm };
}

describe("AddSupplyDialog", () => {
  beforeEach(() => {
    mockGetAllSupplies.mockReset();
    mockGetAllSupplies.mockResolvedValue({
      items: [
        buildSupply({ id: "s1", name: "Vivienda A", code: "CUPS1" }),
        buildSupply({ id: "s2", name: "Local B", code: "CUPS2" }),
      ],
      number: 0,
      totalPages: 1,
    });
  });

  it("does not fetch the catalogue until opened", () => {
    renderWithProviders(
      <AddSupplyDialog isOpen={false} communityId="community-1" alreadyAddedSupplyIds={new Set()} onCancel={vi.fn()} onConfirm={vi.fn()} />,
    );
    expect(mockGetAllSupplies).not.toHaveBeenCalled();
  });

  it("lists supplies once loaded, and marks an already-added supply as disabled", async () => {
    renderDialog({ alreadyAddedSupplyIds: new Set(["s1"]) });

    expect(await screen.findByText("Vivienda A")).toBeInTheDocument();
    expect(screen.getByText("Local B")).toBeInTheDocument();
    expect(screen.getByText(/Ya añadido/)).toBeInTheDocument();
  });

  it("filters the loaded list client-side as the user types", async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByText("Vivienda A");

    await user.type(screen.getByPlaceholderText("Buscar por nombre o CUPS"), "Local");

    await waitFor(() => expect(screen.queryByText("Vivienda A")).not.toBeInTheDocument());
    expect(screen.getByText("Local B")).toBeInTheDocument();
  });

  it("multi-selects supplies and confirms with all of them at once", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();
    await screen.findByText("Vivienda A");

    await user.click(screen.getByText("Vivienda A"));
    await user.click(screen.getByText("Local B"));
    await user.click(screen.getByRole("button", { name: /Añadir \(2\)/ }));

    expect(onConfirm).toHaveBeenCalledWith([
      expect.objectContaining({ id: "s1" }),
      expect.objectContaining({ id: "s2" }),
    ]);
  });

  it("disables Añadir while nothing is selected", async () => {
    renderDialog();
    await screen.findByText("Vivienda A");
    expect(screen.getByRole("button", { name: "Añadir" })).toBeDisabled();
  });
});
