import '@testing-library/jest-dom'
import { render, screen } from "@testing-library/react"
import { SideMenu } from "./SideMenu"
import { MemoryRouter } from "react-router"
import { expect, test, vi } from "vitest"

const MENU_ELEMENTS = ['Inicio', 'Producción', 'Consumo', 'Socios', 'Contacto', 'Ayuda']

test("SideMenu contains all required elements", async () => {
  const closeFn = vi.fn();
  render(<MemoryRouter><SideMenu isMenuOpened={true} onMenuClose={closeFn} /></MemoryRouter>)
  MENU_ELEMENTS.forEach(menuElement => {
    expect(screen.getByText(menuElement)).toBeVisible();
  })
});

test("SideMenu displays no elements when closed", async () => {
  const closeFn = vi.fn();
  render(<MemoryRouter><SideMenu isMenuOpened={false} onMenuClose={closeFn} /></MemoryRouter>)
  MENU_ELEMENTS.forEach(menuElement => {
    expect(screen.getByText(menuElement)).toBeInTheDocument();
    expect(screen.getByText(menuElement)).not.toBeVisible();
  })
});
