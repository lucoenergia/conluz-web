import "@testing-library/jest-dom";
import { expect, test, vi } from "vitest";
import { ProfileMenu } from "./ProfileMenu";
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router";
import userEvent from "@testing-library/user-event";
import type { QueryClient } from "@tanstack/react-query";
import { getGetCurrentUserQueryKey } from "../../api/users/users";
import { createTestQueryClient, renderWithProviders } from "../../test/renderWithProviders";

// Through the harness rather than a hand-built provider stack: LoggedUserProvider
// is a query now (#203), so it has to sit under the QueryClientProvider, and the
// harness is the one place that nesting is written down.
function setup(queryClient: QueryClient = createTestQueryClient()) {
  renderWithProviders(
    <Routes>
      <Route path="/" element={<ProfileMenu username="Luis Mata" />} />
      <Route path="/login" element={<div>Login page</div>} />
    </Routes>,
    { route: "/", queryClient },
  );
}

test("ProfileMenu renders correctly with menu hidden", async () => {
  setup();
  expect(screen.getByText("Luis Mata")).not.toBeVisible();
  expect(screen.getByText("Mi perfil")).not.toBeVisible();
  expect(screen.getByText("Cambiar contraseña")).not.toBeVisible();
  expect(screen.getByText("¿Necesitas ayuda?")).not.toBeVisible();
  expect(screen.getByText("Salir")).not.toBeVisible();
});

test("ProfileMenu opens menu when clicking", async () => {
  const user = userEvent.setup();
  setup();
  await user.click(screen.getByRole("button"));
  expect(screen.getByText("Luis Mata")).toBeVisible();
  expect(screen.getByText("Mi perfil")).toBeVisible();
  expect(screen.getByText("Cambiar contraseña")).toBeVisible();
  expect(screen.getByText("¿Necesitas ayuda?")).toBeVisible();
  expect(screen.getByText("Salir")).toBeVisible();
});

test("ProfileMenu clears the query cache and navigates to login on logout", async () => {
  const user = userEvent.setup();
  const queryClient = createTestQueryClient();
  // The real key, because the signed-in user is now served from it: this is a
  // previous user's response still sitting in the cache.
  queryClient.setQueryData(getGetCurrentUserQueryKey(), { id: "prev-user" });
  const clearSpy = vi.spyOn(queryClient, "clear");

  setup(queryClient);

  await user.click(screen.getByRole("button"));
  await user.click(screen.getByText("Salir"));

  // Clearing the cache is the fix: it prevents the previous user's response from
  // leaking into the next session and driving the landing redirect off stale data.
  expect(clearSpy).toHaveBeenCalledTimes(1);
  expect(queryClient.getQueryData(getGetCurrentUserQueryKey())).toBeUndefined();
  expect(await screen.findByText("Login page")).toBeInTheDocument();
});

test("ProfileMenu closes menu when removing focus", async () => {
  const user = userEvent.setup();
  setup();
  await user.click(screen.getByRole("button"));
  await user.keyboard("{Escape}");
  expect(screen.getByText("Luis Mata")).not.toBeVisible();
  expect(screen.getByText("Mi perfil")).not.toBeVisible();
  expect(screen.getByText("Cambiar contraseña")).not.toBeVisible();
  expect(screen.getByText("¿Necesitas ayuda?")).not.toBeVisible();
  expect(screen.getByText("Salir")).not.toBeVisible();
});

test("menu items are single links, never an anchor wrapping a menuitem", async () => {
  // Regression guard. These used to be `<Box component={Link}><MenuItem/></Box>`,
  // which nests an interactive role="menuitem" inside an <a> — invalid, and
  // ambiguous to announce. Each entry must be ONE element that is both.
  const user = userEvent.setup();
  setup();
  await user.click(screen.getByRole("button", { name: "Abrir menú de usuario" }));

  const nested = Array.from(document.querySelectorAll("a[href]")).filter((a) =>
    a.querySelector('button, [role="menuitem"], [role="button"], a[href]'),
  );
  expect(nested).toEqual([]);

  for (const label of ["Mi perfil", "Cambiar contraseña", "¿Necesitas ayuda?"]) {
    const item = screen.getByRole("menuitem", { name: label });
    expect(item.tagName).toBe("A");
    expect(item).toHaveAttribute("href");
  }
});
