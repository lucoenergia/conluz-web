import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import { apiError } from "../../test/apiError";
import { buildCommunity, buildCommunityCapabilities, buildCurrentUser, buildSupply, buildUser } from "../../test/fixtures";
import type { RestErrorDetailCode } from "../../api/models";

const COMMUNITY_ID = "c1";
const SERVER_MESSAGE = "TEST-SERVER-MESSAGE";
const GENERIC =
  "Ha habido un problema al crear un nuevo punto de suministro. Por favor, inténtalo más tarde";
const mockNavigate = vi.fn();
const mockErrorDispatch = vi.fn();

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));
vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));
// useActiveCommunityResource reads the active community from useGetCommunityById.
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllCommunities: vi.fn(),
  useGetCommunityById: vi.fn(),
}));
// Mutation stubbed to assert its arguments; the spread keeps the query-key
// getters the actions layer invalidates with.
vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useCreateSupply: vi.fn(),
}));
// The owner picker loads the user list. useGetSuppliesByUserId is read by the
// harness's real CommunityProvider; the community is seeded, so it stays unanswered.
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllUsers: vi.fn(),
  useGetSuppliesByUserId: vi.fn(),
}));
vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => buildCurrentUser({ id: "admin", memberships: { [COMMUNITY_ID]: "COMMUNITY_ADMIN" } }),
}));

import {
  useGetAllCommunities,
  useGetCommunityById,
  type getAllCommunities,
  type getCommunityById,
} from "../../api/communities/communities";
import { useCreateSupply } from "../../api/supplies/supplies";
import { useGetAllUsers, useGetSuppliesByUserId, type getAllUsers } from "../../api/users/users";
import { CreateSupplyPage } from "./CreateSupply";

const OWNER = buildUser({ id: "u-ana", fullName: "Ana García", personalId: "12345678Z" });

let mutateAsync: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mutateAsync = vi.fn().mockResolvedValue(buildSupply());
  vi.mocked(useCreateSupply).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useGetSuppliesByUserId).mockReturnValue(query.disabled());
  vi.mocked(useGetCommunityById).mockReturnValue(
    query.success<typeof getCommunityById>(
      buildCommunity({
        id: COMMUNITY_ID,
        name: "Sol Común",
        capabilities: buildCommunityCapabilities({ canManage: true }),
      }),
    ),
  );
  vi.mocked(useGetAllCommunities).mockReturnValue(
    query.success<typeof getAllCommunities>([buildCommunity({ id: COMMUNITY_ID, name: "Sol Común" })]),
  );
  vi.mocked(useGetAllUsers).mockReturnValue(
    query.success<typeof getAllUsers>({ items: [OWNER], size: 10000, totalElements: 1, totalPages: 1, number: 0 }),
  );
});

const render = () =>
  renderWithProviders(<CreateSupplyPage />, { activeCommunityId: COMMUNITY_ID, route: "/supply-points/new" });

const nameInput = () => screen.getByRole("textbox", { name: /^Nombre/ });
const ownerInput = () => screen.getByRole("combobox", { name: /^Propietario/ });
const cupsInput = () => screen.getByRole("textbox", { name: /^CUPS/ });
const addressInput = () => screen.getByRole("textbox", { name: /^Dirección/ });

async function fillAndSubmit(u: ReturnType<typeof userEvent.setup>) {
  await u.type(nameInput(), "Casa");
  await u.click(ownerInput());
  await u.click(await screen.findByRole("option", { name: "Ana García (12345678Z)" }));
  await u.type(cupsInput(), "ES0031300119158001DL0F");
  await u.type(addressInput(), "Calle Mayor 1");
  await u.click(screen.getByRole("button", { name: "Crear punto de suministro" }));
}

function expectTypedValuesKept() {
  expect(nameInput()).toHaveValue("Casa");
  expect(ownerInput()).toHaveValue("Ana García (12345678Z)");
  expect(cupsInput()).toHaveValue("ES0031300119158001DL0F");
  expect(addressInput()).toHaveValue("Calle Mayor 1");
}

const refusal = (code: RestErrorDetailCode, status = 400) => apiError(status, { code, message: SERVER_MESSAGE });

describe("CreateSupplyPage", () => {
  it("creates the supply for the chosen owner, and returns to the list", async () => {
    const u = userEvent.setup();
    render();

    await fillAndSubmit(u);

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/supply-points"));
    expect(mutateAsync).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: "ES0031300119158001DL0F",
        address: "Calle Mayor 1",
        personalId: "12345678Z",
        communityId: COMMUNITY_ID,
      }),
    });
  });
});

describe("CreateSupplyPage: a refused creation", () => {
  it.each<[RestErrorDetailCode, string]>([
    ["SUPPLY_CUPS_INVALID", "El CUPS tiene que tener 20 o 22 caracteres, sin espacios."],
    ["SUPPLY_ALREADY_EXISTS", "Ya hay un punto de suministro con este CUPS en la comunidad."],
    ["SUPPLY_REGISTERED_IN_ANOTHER_COMMUNITY", "Este CUPS ya está registrado en otra comunidad."],
  ])("UI-SUP-009 UI-ERR-002 shows %s on the CUPS input and keeps every typed value", async (code, message) => {
    mutateAsync.mockRejectedValue(refusal(code));
    const u = userEvent.setup();
    render();

    await fillAndSubmit(u);

    await waitFor(() => expect(cupsInput()).toHaveAccessibleDescription(message));
    expect(cupsInput()).toBeInvalid();
    expect(ownerInput()).toBeValid();
    expect(screen.queryByText(SERVER_MESSAGE)).not.toBeInTheDocument();
    expect(mockErrorDispatch).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expectTypedValuesKept();
  });

  it("UI-SUP-009 UI-ERR-002 shows SUPPLY_OWNER_NOT_FOUND on the Propietario input and keeps every typed value", async () => {
    mutateAsync.mockRejectedValue(refusal("SUPPLY_OWNER_NOT_FOUND", 404));
    const u = userEvent.setup();
    render();

    await fillAndSubmit(u);

    await waitFor(() =>
      expect(ownerInput()).toHaveAccessibleDescription("No hay ningún miembro de la comunidad con ese DNI/NIE/NIF."),
    );
    expect(ownerInput()).toBeInvalid();
    expect(cupsInput()).toBeValid();
    expect(mockErrorDispatch).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expectTypedValuesKept();
  });

  it("UI-ERR-002 clears the CUPS error once the CUPS is edited, not when another input is", async () => {
    mutateAsync.mockRejectedValue(refusal("SUPPLY_ALREADY_EXISTS"));
    const u = userEvent.setup();
    render();
    await fillAndSubmit(u);
    await waitFor(() => expect(cupsInput()).toBeInvalid());

    await u.type(addressInput(), "B");
    expect(cupsInput()).toBeInvalid();

    await u.type(cupsInput(), "X");
    expect(cupsInput()).toBeValid();
    expect(cupsInput()).not.toHaveAccessibleDescription();
  });

  it("UI-ERR-001 keeps the generic message for a refusal the form cannot place", async () => {
    mutateAsync.mockRejectedValue(apiError(500));
    const u = userEvent.setup();
    render();

    await fillAndSubmit(u);

    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalledWith(GENERIC));
    expect(cupsInput()).toBeValid();
    expect(ownerInput()).toBeValid();
    expect(mockNavigate).not.toHaveBeenCalled();
    expectTypedValuesKept();
  });
});
