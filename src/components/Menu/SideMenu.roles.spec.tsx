import "@testing-library/jest-dom";
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SideMenu } from "./SideMenu";
import { MENU_ITEMS, type MenuItem } from "../../utils/constants";

function filterItems(isCommunityAdmin: boolean, isPlatformAdmin: boolean): MenuItem[] {
  return MENU_ITEMS.filter((item) => {
    if (item.access === "all") return true;
    if (item.access === "communityAdmin") return isCommunityAdmin;
    if (item.access === "platformAdmin") return isPlatformAdmin;
    return false;
  });
}

function setup(items: MenuItem[]) {
  render(
    <MemoryRouter>
      <SideMenu isMenuOpened menuItems={items} onMenuClose={() => {}} />
    </MemoryRouter>,
  );
}

describe("SideMenu role-aware visibility", () => {
  test("regular member sees only 'all' items", () => {
    const items = filterItems(false, false);
    setup(items);
    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.getByText("Producción")).toBeInTheDocument();
    expect(screen.getByText("Consumo")).toBeInTheDocument();
    expect(screen.queryByText("Socios")).not.toBeInTheDocument();
    expect(screen.queryByText("Comunidades")).not.toBeInTheDocument();
    expect(screen.queryByText("Miembros")).not.toBeInTheDocument();
  });

  test("community admin sees 'all' + 'communityAdmin' items but not platform-admin items", () => {
    const items = filterItems(true, false);
    setup(items);
    expect(screen.getByText("Socios")).toBeInTheDocument();
    expect(screen.getByText("Miembros")).toBeInTheDocument();
    expect(screen.getByText("Integraciones")).toBeInTheDocument();
    expect(screen.queryByText("Comunidades")).not.toBeInTheDocument();
  });

  test("platform admin sees all items including communities", () => {
    const items = filterItems(true, true);
    setup(items);
    expect(screen.getByText("Comunidades")).toBeInTheDocument();
    expect(screen.getByText("Socios")).toBeInTheDocument();
    expect(screen.getByText("Miembros")).toBeInTheDocument();
  });
});
