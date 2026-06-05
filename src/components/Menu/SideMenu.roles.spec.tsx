import "@testing-library/jest-dom";
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SideMenu } from "./SideMenu";
import { CONTACT_ITEM, MENU_SECTIONS, type MenuSection } from "../../utils/constants";

function filterSections(hasActiveCommunity: boolean, isCommunityAdmin: boolean, isPlatformAdmin: boolean): MenuSection[] {
  return MENU_SECTIONS.filter((section) => {
    if (section.visibility === "operational") return hasActiveCommunity;
    if (section.visibility === "communityAdmin") return isCommunityAdmin;
    if (section.visibility === "platformAdmin") return isPlatformAdmin;
    return false;
  });
}

function setup(sections: MenuSection[]) {
  render(
    <MemoryRouter>
      <SideMenu isMenuOpened sections={sections} contactItem={CONTACT_ITEM} onMenuClose={() => {}} />
    </MemoryRouter>,
  );
}

describe("SideMenu role-aware section visibility", () => {
  test("regular member with active community sees only operational items", () => {
    setup(filterSections(true, false, false));
    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.getByText("Producción")).toBeInTheDocument();
    expect(screen.getByText("Consumo")).toBeInTheDocument();
    expect(screen.queryByText("Miembros")).not.toBeInTheDocument();
    expect(screen.queryByText("Integraciones")).not.toBeInTheDocument();
    expect(screen.queryByText("Comunidades")).not.toBeInTheDocument();
    expect(screen.queryByText("Usuarios")).not.toBeInTheDocument();
  });

  test("community admin sees operational + community-management items, not platform items", () => {
    setup(filterSections(true, true, false));
    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.getByText("Consumo")).toBeInTheDocument();
    expect(screen.getByText("Miembros")).toBeInTheDocument();
    expect(screen.getByText("Integraciones")).toBeInTheDocument();
    expect(screen.queryByText("Comunidades")).not.toBeInTheDocument();
    expect(screen.queryByText("Usuarios")).not.toBeInTheDocument();
  });

  test("platform admin without active community sees only platform-admin items", () => {
    setup(filterSections(false, false, true));
    expect(screen.queryByText("Inicio")).not.toBeInTheDocument();
    expect(screen.queryByText("Miembros")).not.toBeInTheDocument();
    expect(screen.getByText("Comunidades")).toBeInTheDocument();
    expect(screen.getByText("Usuarios")).toBeInTheDocument();
  });

  test("platform admin who is also a community member sees all sections", () => {
    setup(filterSections(true, true, true));
    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.getByText("Miembros")).toBeInTheDocument();
    expect(screen.getByText("Comunidades")).toBeInTheDocument();
    expect(screen.getByText("Usuarios")).toBeInTheDocument();
  });

  test("Contacto is always visible regardless of role", () => {
    setup(filterSections(false, false, false));
    expect(screen.getByText("Contacto")).toBeInTheDocument();

    setup(filterSections(true, true, true));
    expect(screen.getAllByText("Contacto")).toHaveLength(2);
  });

  test("Socios is never in the menu", () => {
    setup(filterSections(true, true, true));
    expect(screen.queryByText("Socios")).not.toBeInTheDocument();
  });

  test("community switch updates section visibility: admin of A, member of B → only operational when B is active", () => {
    const adminSections = filterSections(true, true, false);
    const memberSections = filterSections(true, false, false);

    const { rerender } = render(
      <MemoryRouter>
        <SideMenu isMenuOpened sections={adminSections} contactItem={CONTACT_ITEM} onMenuClose={() => {}} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Miembros")).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <SideMenu isMenuOpened sections={memberSections} contactItem={CONTACT_ITEM} onMenuClose={() => {}} />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Miembros")).not.toBeInTheDocument();
    expect(screen.getByText("Inicio")).toBeInTheDocument();
  });
});
