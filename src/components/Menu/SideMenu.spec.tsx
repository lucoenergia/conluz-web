import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { SideMenu } from "./SideMenu";
import { MemoryRouter } from "react-router";
import { expect, test } from "vitest";
import { CONTACT_ITEM, MENU_SECTIONS } from "../../utils/constants";

function setup(menuOpened: boolean) {
  render(
    <MemoryRouter>
      <SideMenu
        isMenuOpened={menuOpened}
        onMenuClose={() => {}}
        sections={MENU_SECTIONS}
        contactItem={CONTACT_ITEM}
      />
    </MemoryRouter>,
  );
}

test("SideMenu renders all section items and contact item when open", () => {
  setup(true);
  MENU_SECTIONS.forEach((section) => {
    expect(screen.getByText(section.title)).toBeVisible();
    section.items.forEach((item) => {
      expect(screen.getByText(item.label)).toBeVisible();
    });
  });
  expect(screen.getByText(CONTACT_ITEM.label)).toBeVisible();
});

test("SideMenu hides content when closed", () => {
  setup(false);
  MENU_SECTIONS.forEach((section) => {
    section.items.forEach((item) => {
      expect(screen.getByText(item.label)).not.toBeVisible();
    });
  });
  expect(screen.getByText(CONTACT_ITEM.label)).not.toBeVisible();
});
