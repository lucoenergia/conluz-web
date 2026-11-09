import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import { apiError } from "../../test/apiError";
import { pressBack } from "../../test/overlay";
import { overlayHistorySettled } from "../../components/ResponsiveOverlay/overlayHistory";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildCurrentUser,
  buildMembership,
  buildSupply,
  buildUser,
} from "../../test/fixtures";
import type { RestErrorDetailCode } from "../../api/models";

const COMMUNITY_ID = "c1";
const OTHER_COMMUNITY_ID = "c2";
const SERVER_MESSAGE = "TEST-SERVER-MESSAGE";
const GENERIC =
  "Ha habido un problema al crear un nuevo punto de suministro. Por favor, inténtalo más tarde";
const mockErrorDispatch = vi.fn();
const onClose = vi.fn();

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
// The owner picker lists the active community's memberships.
vi.mock(import("../../api/memberships/memberships"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetMemberships: vi.fn(),
}));
// useGetSuppliesByUserId is read by the harness's real CommunityProvider; the
// community is seeded, so it stays unanswered. useGetAllUsers is stubbed so a
// test can prove the page never reads the platform-wide listing.
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllUsers: vi.fn(),
  useGetSuppliesByUserId: vi.fn(),
}));
vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () =>
    buildCurrentUser({
      id: "admin",
      memberships: { [COMMUNITY_ID]: "COMMUNITY_ADMIN", [OTHER_COMMUNITY_ID]: "COMMUNITY_ADMIN" },
    }),
}));

import {
  useGetAllCommunities,
  useGetCommunityById,
  type getAllCommunities,
  type getCommunityById,
} from "../../api/communities/communities";
import { useCreateSupply } from "../../api/supplies/supplies";
import { useGetMemberships, type getMemberships } from "../../api/memberships/memberships";
import { useGetAllUsers, useGetSuppliesByUserId, type getAllUsers } from "../../api/users/users";
import { SupplyFormDialog } from "./SupplyFormDialog";

const OWNER = buildMembership({
  id: "m-ana",
  communityId: COMMUNITY_ID,
  fullName: "Ana García",
  personalId: "12345678Z",
});

const COMMUNITY_NAMES: Record<string, string> = { [COMMUNITY_ID]: "Sol Común", [OTHER_COMMUNITY_ID]: "Viento Sur" };

const OTHER_MEMBER = buildMembership({
  id: "m-luis",
  communityId: OTHER_COMMUNITY_ID,
  fullName: "Luis Gil",
  personalId: "87654321X",
});
const OTHER_COMMUNITY_USER = buildUser({ id: "u-luis", fullName: "Luis Gil", personalId: "87654321X" });

let mutateAsync: Mock;

beforeEach(() => {
  vi.clearAllMocks();
  mutateAsync = vi.fn().mockResolvedValue(buildSupply());
  vi.mocked(useCreateSupply).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useGetSuppliesByUserId).mockReturnValue(query.disabled());
  // The caller administers both communities, as in the report behind #388.
  vi.mocked(useGetCommunityById).mockImplementation((communityId) =>
    query.success<typeof getCommunityById>(
      buildCommunity({
        id: communityId,
        name: COMMUNITY_NAMES[communityId],
        capabilities: buildCommunityCapabilities({ canManage: true, canManageMemberships: true }),
      }),
    ),
  );
  vi.mocked(useGetAllCommunities).mockReturnValue(
    query.success<typeof getAllCommunities>([
      buildCommunity({ id: COMMUNITY_ID, name: COMMUNITY_NAMES[COMMUNITY_ID] }),
      buildCommunity({ id: OTHER_COMMUNITY_ID, name: COMMUNITY_NAMES[OTHER_COMMUNITY_ID] }),
    ]),
  );
  // Were the page to read the platform-wide listing, it would find the other
  // community's member there.
  vi.mocked(useGetAllUsers).mockReturnValue(
    query.success<typeof getAllUsers>({ items: [OTHER_COMMUNITY_USER], size: 1, totalElements: 1, totalPages: 1, number: 0 }),
  );
  vi.mocked(useGetMemberships).mockReturnValue(query.success<typeof getMemberships>([OWNER]));
});

/**
 * The supply form in create mode (#372): what it offers as owner, what it
 * sends, where a refusal lands, and its lock while the save is in flight.
 * Where it opens from, and what the list shows afterwards, is
 * SupplyPointsPage.supplyForm.spec.tsx's.
 */
const render = () =>
  renderWithProviders(<SupplyFormDialog target={{ kind: "create" }} onClose={onClose} />, {
    activeCommunityId: COMMUNITY_ID,
  });

const createButton = () => screen.getByRole("button", { name: "Crear punto de suministro" });
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

afterEach(async () => {
  // An overlay left open gives its history entry back on unmount: let that
  // back land before the next test reads the history.
  cleanup();
  await act(() => overlayHistorySettled());
});

const refusal = (code: RestErrorDetailCode, status = 400) => apiError(status, { code, message: SERVER_MESSAGE });

describe("SupplyFormDialog: creating", () => {
  it("UI-OVL-006 is a dialog named by its title", () => {
    render();

    expect(screen.getByRole("dialog", { name: "Crear punto de suministro en Sol Común" })).toBeInTheDocument();
  });

  it("creates the supply for the chosen owner, and closes", async () => {
    const u = userEvent.setup();
    render();

    await fillAndSubmit(u);

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
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

describe("SupplyFormDialog: a refused creation", () => {
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
    await waitFor(() => expect(cupsInput()).toHaveFocus());
    expect(ownerInput()).toBeValid();
    expect(screen.queryByText(SERVER_MESSAGE)).not.toBeInTheDocument();
    expect(mockErrorDispatch).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
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
    await waitFor(() => expect(ownerInput()).toHaveFocus());
    expect(cupsInput()).toBeValid();
    expect(mockErrorDispatch).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
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

  it("UI-ERR-001 keeps the generic message for a refusal the form cannot place, and stays open", async () => {
    mutateAsync.mockRejectedValue(apiError(500));
    const u = userEvent.setup();
    render();

    await fillAndSubmit(u);

    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalledWith(GENERIC));
    expect(screen.getByRole("dialog", { name: "Crear punto de suministro en Sol Común" })).toBeInTheDocument();
    expect(cupsInput()).toBeValid();
    expect(ownerInput()).toBeValid();
    expect(onClose).not.toHaveBeenCalled();
    expectTypedValuesKept();
  });
});

describe("UI-SUP-016 the owner options are the active community's memberships", () => {
  // One membership per state the backend accepts as owner (SUP-002); each
  // record names the person differently from any account.
  const PENDING = buildMembership({
    id: "m-pending",
    communityId: COMMUNITY_ID,
    fullName: "Pilar Ruiz",
    personalId: "11111111H",
    acceptedAt: null,
  });
  const ACCEPTED = buildMembership({
    id: "m-accepted",
    communityId: COMMUNITY_ID,
    fullName: "Ana García (registro)",
    personalId: "22222222J",
    acceptedAt: "2026-02-01T00:00:00Z",
    enabled: true,
  });
  const DISABLED = buildMembership({
    id: "m-disabled",
    communityId: COMMUNITY_ID,
    fullName: "Jorge Sanz",
    personalId: "33333333P",
    acceptedAt: "2026-02-01T00:00:00Z",
    enabled: false,
  });
  const PENDING_DISABLED = buildMembership({
    id: "m-pending-disabled",
    communityId: COMMUNITY_ID,
    fullName: "Marta Vidal",
    personalId: "44444444A",
    acceptedAt: null,
    enabled: false,
  });
  const BY_COMMUNITY: Record<string, ReturnType<typeof buildMembership>[]> = {
    [COMMUNITY_ID]: [PENDING, ACCEPTED, DISABLED, PENDING_DISABLED],
    [OTHER_COMMUNITY_ID]: [OTHER_MEMBER],
  };
  const label = (m: { fullName: string; personalId: string }) => `${m.fullName} (${m.personalId})`;

  beforeEach(() => {
    vi.mocked(useGetMemberships).mockImplementation((communityId) =>
      query.success<typeof getMemberships>(BY_COMMUNITY[communityId] ?? []),
    );
  });

  it("UI-SUP-016 offers exactly the active community's memberships, in every state, and no one else's", async () => {
    const u = userEvent.setup();
    render();

    await u.click(ownerInput());

    const options = within(await screen.findByRole("listbox")).getAllByRole("option");
    // Which members, not in what order: the order has its own test.
    expect(options.map((o) => o.textContent).sort()).toEqual(BY_COMMUNITY[COMMUNITY_ID].map(label).sort());
    expect(screen.queryByRole("option", { name: /Luis Gil/ })).not.toBeInTheDocument();
    expect(vi.mocked(useGetMemberships).mock.calls.every(([id]) => id === COMMUNITY_ID)).toBe(true);
  });

  it("UI-SUP-016 orders the options by full name, regardless of the order received", async () => {
    const at = (id: string, fullName: string, personalId: string) =>
      buildMembership({ id, communityId: COMMUNITY_ID, fullName, personalId });
    // Served out of order. "Álvaro" sorts with "alvaro" (accent and case aside),
    // so the two tie and fall back to the membership id; "Ñuñez" follows "Nuñez".
    const ZOE = at("m-1", "Zoe Prat", "10000001A");
    const ALVARO_ACCENT = at("m-3", "Álvaro Gil", "10000003C");
    const NUNEZ_TILDE = at("m-4", "Ñuñez Roca", "10000004D");
    const ALVARO_LOWER = at("m-2", "alvaro gil", "10000002B");
    const NUNEZ = at("m-5", "Nuñez Roca", "10000005E");
    const BEATRIZ = at("m-6", "beatriz Sol", "10000006F");
    vi.mocked(useGetMemberships).mockReturnValue(
      query.success<typeof getMemberships>([ZOE, ALVARO_ACCENT, NUNEZ_TILDE, ALVARO_LOWER, NUNEZ, BEATRIZ]),
    );
    const u = userEvent.setup();
    render();

    await u.click(ownerInput());

    const options = within(await screen.findByRole("listbox")).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(
      [ALVARO_LOWER, ALVARO_ACCENT, BEATRIZ, NUNEZ, NUNEZ_TILDE, ZOE].map(label),
    );
  });

  it("UI-SUP-016 sends the chosen membership's personalId and the active community to createSupply", async () => {
    const u = userEvent.setup();
    render();

    await u.click(ownerInput());
    await u.click(await screen.findByRole("option", { name: label(DISABLED) }));
    await u.type(cupsInput(), "ES0031300119158001DL0F");
    await u.type(addressInput(), "Calle Mayor 1");
    await u.click(createButton());

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync.mock.calls[0][0].data).toMatchObject({
      personalId: DISABLED.personalId,
      communityId: COMMUNITY_ID,
    });
  });

  it("UI-SUP-016 tells two members with the same name and DNI apart, by membership", async () => {
    const FIRST = buildMembership({ id: "m-twin-1", communityId: COMMUNITY_ID, fullName: "Ana García", personalId: "12345678Z" });
    const SECOND = buildMembership({ id: "m-twin-2", communityId: COMMUNITY_ID, fullName: "Ana García", personalId: "12345678Z" });
    vi.mocked(useGetMemberships).mockReturnValue(query.success<typeof getMemberships>([FIRST, SECOND]));
    const consoleError = vi.spyOn(console, "error");
    const u = userEvent.setup();
    render();

    await u.click(ownerInput());
    await u.click((await screen.findAllByRole("option", { name: label(SECOND) }))[1]);
    await u.click(ownerInput());

    const [first, second] = within(await screen.findByRole("listbox")).getAllByRole("option");
    expect(first).toHaveAttribute("aria-selected", "false");
    expect(second).toHaveAttribute("aria-selected", "true");
    expect(consoleError.mock.calls.flat().join(" ")).not.toMatch(/same key/);
    consoleError.mockRestore();
  });

  // The required owner input already stops a browser from submitting; with
  // that check off, the page itself must still not fall back to the caller.
  it("UI-SUP-016 sends nothing when no owner is chosen, rather than making the caller the owner", async () => {
    const u = userEvent.setup();
    render();
    const form = createButton().closest("form");
    if (!form) throw new Error("the create button is not inside a form");
    form.noValidate = true;

    await u.type(nameInput(), "Casa");
    await u.type(cupsInput(), "ES0031300119158001DL0F");
    await u.type(addressInput(), "Calle Mayor 1");
    await u.click(createButton());

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("UI-SUP-016 replaces the options and clears the choice when the active community changes", async () => {
    const u = userEvent.setup();
    const { switchActiveCommunity } = render();
    await u.click(ownerInput());
    await u.click(await screen.findByRole("option", { name: label(ACCEPTED) }));
    expect(ownerInput()).toHaveValue(label(ACCEPTED));

    switchActiveCommunity(OTHER_COMMUNITY_ID);

    await waitFor(() => expect(ownerInput()).toHaveValue(""));
    await u.click(ownerInput());
    const options = within(await screen.findByRole("listbox")).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([label(OTHER_MEMBER)]);
  });
});

describe("UI-SUP-017 a community with no owner to offer cannot be submitted", () => {
  async function fillAllButOwner(u: ReturnType<typeof userEvent.setup>) {
    await u.type(nameInput(), "Casa");
    await u.type(cupsInput(), "ES0031300119158001DL0F");
    await u.type(addressInput(), "Calle Mayor 1{Enter}");
  }

  it("UI-SUP-017 says the community has no members yet, and sends nothing", async () => {
    vi.mocked(useGetMemberships).mockReturnValue(query.success<typeof getMemberships>([]));
    const u = userEvent.setup();
    render();

    expect(ownerInput()).toHaveAccessibleDescription(
      "Esta comunidad todavía no tiene miembros. Añádelos antes de crear un punto de suministro.",
    );
    expect(createButton()).toBeDisabled();
    await fillAllButOwner(u);
    await u.click(createButton());
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("UI-SUP-017 says the members could not be loaded, and sends nothing", async () => {
    vi.mocked(useGetMemberships).mockReturnValue(query.error(apiError(500)));
    const u = userEvent.setup();
    render();

    expect(ownerInput()).toHaveAccessibleDescription(
      "No se pudieron cargar los miembros de esta comunidad. Inténtalo más tarde.",
    );
    expect(ownerInput()).toBeInvalid();
    expect(createButton()).toBeDisabled();
    await fillAllButOwner(u);
    await u.click(createButton());
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});

describe("UI-SUP-018 the create form never reads the platform-wide user listing", () => {
  it("UI-SUP-018 never calls getAllUsers", async () => {
    const u = userEvent.setup();
    render();

    await fillAndSubmit(u);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(vi.mocked(useGetAllUsers)).not.toHaveBeenCalled();
    expect(screen.queryByText(/Luis Gil/)).not.toBeInTheDocument();
  });
});

describe("UI-SUP-021 a create in flight", () => {
  const DIALOG = "Crear punto de suministro en Sol Común";

  // The request never answers, so the save stays in flight for the whole test.
  async function sendAndHold(u: ReturnType<typeof userEvent.setup>) {
    mutateAsync.mockReturnValue(new Promise(() => {}));
    render();
    await fillAndSubmit(u);
    return screen.getByRole("dialog", { name: DIALOG });
  }

  it("UI-SUP-021 UI-OVL-002 shows its progress, makes every input read-only and offers no second submit", async () => {
    const u = userEvent.setup();
    const dialog = await sendAndHold(u);

    expect(await within(dialog).findByRole("button", { name: "Creando..." })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Cancelar" })).toBeDisabled();
    for (const field of within(dialog).getAllByRole("textbox")) expect(field).toHaveAttribute("readonly");
    expect(ownerInput()).toHaveAttribute("readonly");
    await u.click(ownerInput());
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("UI-SUP-021 sends one request however often the form is submitted", async () => {
    const u = userEvent.setup();
    const dialog = await sendAndHold(u);
    const form = within(dialog).getByRole("button", { name: "Creando..." }).closest("form");
    if (!form) throw new Error("the submit is not inside a form");

    // Enter in a field submits the form whatever its button shows.
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("UI-OVL-002 stays open on Escape, the backdrop and back while the create runs", async () => {
    const u = userEvent.setup();
    const dialog = await sendAndHold(u);
    await within(dialog).findByRole("button", { name: "Creando..." });

    fireEvent.keyDown(dialog, { key: "Escape" });
    // Structural: the backdrop has no role or name; it is MUI's own element.
    await u.click(document.querySelector(".MuiBackdrop-root") as HTMLElement);
    await pressBack();

    expect(screen.getByRole("dialog", { name: DIALOG })).toBe(dialog);
    expect(onClose).not.toHaveBeenCalled();
    // The form has changes, so an attempt the lock let through would ask first
    // rather than close: no question either.
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
  });
});
