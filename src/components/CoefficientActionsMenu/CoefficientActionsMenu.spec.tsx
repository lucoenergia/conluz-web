import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { Menu } from "@mui/material";
import { CoefficientActionsMenuItems } from "./CoefficientActionsMenu";
import type { CoefficientAction } from "../../pages/production/sharingAgreementCoefficientState";

function renderMenu(actions: CoefficientAction[], onSelectAction = vi.fn()) {
  render(
    <Menu open anchorEl={document.body}>
      <CoefficientActionsMenuItems actions={actions} onSelectAction={onSelectAction} />
    </Menu>,
  );
  return onSelectAction;
}

describe("CoefficientActionsMenuItems", () => {
  it("renders one menu item per action, preserving the given order", () => {
    renderMenu(["correct", "deactivate", "close"]);
    const items = screen.getAllByRole("menuitem").map((item) => item.textContent);
    expect(items).toEqual(["Corregir fecha", "Desactivar", "Cerrar (baja)"]);
  });

  it("renders no divider for a single-item menu — a PENDING row's lone apply has no lifecycle group to separate from", () => {
    renderMenu(["apply"]);
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
  });

  it("renders exactly one divider between the date-action group and the lifecycle-action group", () => {
    renderMenu(["correct", "deactivate", "close"]);
    expect(screen.getAllByRole("separator")).toHaveLength(1);
  });

  it("groups apply with correct (date actions) ahead of the lifecycle group, for a mixed action set", () => {
    renderMenu(["apply", "deactivate"]);
    const items = screen.getAllByRole("menuitem").map((item) => item.textContent);
    expect(items).toEqual(["Registrar fecha", "Desactivar"]);
    expect(screen.getAllByRole("separator")).toHaveLength(1);
  });

  it("calls onSelectAction with the clicked action", async () => {
    const user = userEvent.setup();
    const onSelectAction = renderMenu(["correct", "deactivate"]);
    await user.click(screen.getByRole("menuitem", { name: "Desactivar" }));
    expect(onSelectAction).toHaveBeenCalledWith("deactivate");
  });
});
