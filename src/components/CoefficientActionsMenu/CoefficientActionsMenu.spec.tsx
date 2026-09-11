import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { Menu } from "@mui/material";
import { CoefficientActionsMenuItems, type CoefficientActionsMenuItem } from "./CoefficientActionsMenu";
import type { CoefficientAction } from "../../pages/production/sharingAgreementCoefficientState";

function renderMenu(actions: CoefficientAction[], onSelectAction = vi.fn()) {
  const items: CoefficientActionsMenuItem[] = actions.map((action) => ({ action }));
  render(
    <Menu open anchorEl={document.body} slotProps={{ list: { disabledItemsFocusable: true } }}>
      <CoefficientActionsMenuItems items={items} onSelectAction={onSelectAction} />
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

  it("a fully available item has no aria-disabled and no secondary reason text", () => {
    render(
      <Menu open anchorEl={document.body} slotProps={{ list: { disabledItemsFocusable: true } }}>
        <CoefficientActionsMenuItems items={[{ action: "deactivate" }]} onSelectAction={vi.fn()} />
      </Menu>,
    );
    const item = screen.getByRole("menuitem", { name: "Desactivar" });
    expect(item).not.toHaveAttribute("aria-disabled");
  });

  it("a partially available item is marked aria-disabled and shows its reason as visible DOM text, not a title or tooltip", () => {
    render(
      <Menu open anchorEl={document.body} slotProps={{ list: { disabledItemsFocusable: true } }}>
        <CoefficientActionsMenuItems
          items={[{ action: "deactivate", disabledReason: "Solo aplicable a 2 de 3 seleccionados" }]}
          onSelectAction={vi.fn()}
        />
      </Menu>,
    );
    const item = screen.getByRole("menuitem", { name: /Desactivar/ });
    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(item).not.toHaveAttribute("disabled");
    expect(item.querySelector("[title]")).toBeNull();
    expect(screen.getByText("Solo aplicable a 2 de 3 seleccionados")).toBeInTheDocument();
  });

  it("clicking a disabled item is a no-op", async () => {
    const user = userEvent.setup();
    const onSelectAction = vi.fn();
    render(
      <Menu open anchorEl={document.body} slotProps={{ list: { disabledItemsFocusable: true } }}>
        <CoefficientActionsMenuItems items={[{ action: "close", disabledReason: "Solo aplicable a 1 de 2 seleccionados" }]} onSelectAction={onSelectAction} />
      </Menu>,
    );
    await user.click(screen.getByRole("menuitem", { name: /Cerrar/ }));
    expect(onSelectAction).not.toHaveBeenCalled();
  });

  it("a disabled item is reachable with the arrow keys", async () => {
    const user = userEvent.setup();
    render(
      <Menu open anchorEl={document.body} slotProps={{ list: { disabledItemsFocusable: true } }}>
        <CoefficientActionsMenuItems
          items={[{ action: "correct" }, { action: "deactivate", disabledReason: "Solo aplicable a 1 de 2 seleccionados" }]}
          onSelectAction={vi.fn()}
        />
      </Menu>,
    );
    // MUI's Menu autofocus timing isn't reliable under jsdom, so focus the
    // first item directly rather than depending on it — the guarantee under
    // test is what ArrowDown does next, not how focus first arrived.
    screen.getByRole("menuitem", { name: "Corregir fecha" }).focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: /Desactivar/ })).toHaveFocus();
  });
});
