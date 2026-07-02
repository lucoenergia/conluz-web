import "@testing-library/jest-dom";
import { expect, test, vi } from "vitest";
import { ProfileMenu } from "./ProfileMenu";
import { screen, render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../../context/auth.context";
import { LoggedUserProvider } from "../../context/logged-user.context";

function setup(queryClient: QueryClient = new QueryClient()) {
  render(
    <AuthProvider>
      <LoggedUserProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/"]}>
            <Routes>
              <Route path="/" element={<ProfileMenu username="Luis Mata" />} />
              <Route path="/login" element={<div>Login page</div>} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </LoggedUserProvider>
    </AuthProvider>,
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
  const queryClient = new QueryClient();
  // Seed the cache to emulate a previous user's cached data (e.g. getCurrentUser).
  queryClient.setQueryData(["users", "current"], { id: "prev-user" });
  const clearSpy = vi.spyOn(queryClient, "clear");

  setup(queryClient);

  await user.click(screen.getByRole("button"));
  await user.click(screen.getByText("Salir"));

  // Clearing the cache is the fix: it prevents the previous user's response from
  // leaking into the next session and driving the landing redirect off stale data.
  expect(clearSpy).toHaveBeenCalledTimes(1);
  expect(queryClient.getQueryData(["users", "current"])).toBeUndefined();
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
