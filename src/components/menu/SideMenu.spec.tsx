import '@testing-library/jest-dom'
import { render, screen } from "@testing-library/react"
import { SideMenu } from "./SideMenu"
import { MemoryRouter } from "react-router"
import { expect, test, vi } from "vitest"
import { MENU_ITEMS } from '../../utils/constants'

const MENU_ELEMENTS = MENU_ITEMS.map(menuItem => menuItem.label)

function setup(menuOpened: boolean, closeFn: Function) {
  render(
    <MemoryRouter>
      <SideMenu isMenuOpened={menuOpened} onMenuClose={closeFn} menuItems={MENU_ITEMS}/>
    </MemoryRouter>
  )
}

test("SideMenu contains all required elements", async () => {
  const closeFn = vi.fn();
  setup(true, closeFn)
  MENU_ELEMENTS.forEach(menuElement => {
    expect(screen.getByText(menuElement)).toBeVisible();
  })
});

test("SideMenu displays no elements when closed", async () => {
  const closeFn = vi.fn();
  setup(false, closeFn)
  MENU_ELEMENTS.forEach(menuElement => {
    expect(screen.getByText(menuElement)).toBeInTheDocument();
    expect(screen.getByText(menuElement)).not.toBeVisible();
  })
});
