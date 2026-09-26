import "@testing-library/jest-dom";
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SideMenu } from "./SideMenu";
import { CONTACT_ITEM, MENU_SECTIONS, type MenuSection } from "../../utils/constants";
import { selectVisibleSections } from "../../utils/menuVisibility";
import type { MenuRequirement } from "../../hooks/permissions";

/**
 * Visibility is exercised through the production rule, not a copy of it. The
 * earlier version of this spec reimplemented the layout's filter, so the menu
 * and the test could drift apart while both stayed green.
 *
 * A run is described by the capabilities the backend grants; anything not
 * listed is refused, which is what the app does with an unknown capability.
 */
function menuFor(granted: string[]): MenuSection[] {
  const isAllowed = (requirement: MenuRequirement) =>
    requirement.scope === "always" || granted.includes(requirement.capability);
  return selectVisibleSections(MENU_SECTIONS, isAllowed);
}

const MEMBER = ["canRead"];
const COMMUNITY_ADMIN = ["canRead", "canManage", "canManageMemberships"];
const PLATFORM_ADMIN = ["canAdministerPlatform", "canListUsers"];

function setup(sections: MenuSection[]) {
  render(
    <MemoryRouter>
      <SideMenu isMenuOpened sections={sections} contactItem={CONTACT_ITEM} onMenuClose={() => {}} />
    </MemoryRouter>,
  );
}

const shows = (label: string) => expect(screen.getByText(label)).toBeInTheDocument();
const hides = (label: string) => expect(screen.queryByText(label)).not.toBeInTheDocument();

describe("SideMenu visibility", () => {
  test("a member of a community sees the operational entries and nothing else", () => {
    setup(menuFor(MEMBER));
    shows("Inicio");
    shows("Producción");
    shows("Consumo");
    hides("Miembros");
    hides("Integraciones");
    hides("Comunidades");
    hides("Usuarios");
  });

  test("a community admin also sees the community-management entries, but no platform ones", () => {
    setup(menuFor(COMMUNITY_ADMIN));
    shows("Inicio");
    shows("Miembros");
    shows("Integraciones");
    hides("Comunidades");
    hides("Usuarios");
  });

  // The golden rule, as a test: the platform flag grants nothing inside a
  // community, so an admin with no membership gets no operational entries.
  test("a platform admin with no membership sees only the platform entries", () => {
    setup(menuFor(PLATFORM_ADMIN));
    shows("Comunidades");
    shows("Usuarios");
    hides("Inicio");
    hides("Miembros");
    hides("Integraciones");
  });

  test("a platform admin who also belongs to a community sees both", () => {
    setup(menuFor([...COMMUNITY_ADMIN, ...PLATFORM_ADMIN]));
    shows("Inicio");
    shows("Miembros");
    shows("Comunidades");
  });

  // The drift this epic fixes. Reaching /integrations needs the community's
  // canManage, so a platform admin who does not administer this community must
  // not be offered it -- the backend refuses every call that page makes.
  test("a platform admin without community-admin rights is not offered Integraciones or Miembros", () => {
    setup(menuFor([...PLATFORM_ADMIN, "canRead"]));
    shows("Inicio");
    shows("Comunidades");
    hides("Integraciones");
    hides("Miembros");
  });

  // The two sit in one section but are not one decision.
  test("granting only canManageMemberships offers Miembros without Integraciones", () => {
    setup(menuFor(["canRead", "canManageMemberships"]));
    shows("Miembros");
    hides("Integraciones");
  });

  test("a section with nothing visible in it does not appear as an empty heading", () => {
    setup(menuFor(MEMBER));
    hides("Gestión de comunidad");
    hides("Administración de plataforma");
  });

  test("Contacto is always offered", () => {
    setup(menuFor([]));
    shows("Contacto");
  });

  test("Socios is never in the menu", () => {
    setup(menuFor([...COMMUNITY_ADMIN, ...PLATFORM_ADMIN]));
    hides("Socios");
  });

  // Admin of A, member of B: switching drops the entries A allowed.
  test("switching to a community the user does not administer drops its entries", () => {
    const { rerender } = render(
      <MemoryRouter>
        <SideMenu isMenuOpened sections={menuFor(COMMUNITY_ADMIN)} contactItem={CONTACT_ITEM} onMenuClose={() => {}} />
      </MemoryRouter>,
    );
    shows("Miembros");

    rerender(
      <MemoryRouter>
        <SideMenu isMenuOpened sections={menuFor(MEMBER)} contactItem={CONTACT_ITEM} onMenuClose={() => {}} />
      </MemoryRouter>,
    );
    hides("Miembros");
    shows("Inicio");
  });
});
