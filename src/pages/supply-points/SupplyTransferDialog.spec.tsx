import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { act, cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import { apiError } from "../../test/apiError";
import { pressBack } from "../../test/overlay";
import { usesReadOnlyPresentation } from "../../test/readOnlyField";
import { overlayHistorySettled } from "../../components/ResponsiveOverlay/overlayHistory";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildMemberRecord,
  buildMembership,
  buildSupply,
  buildSupplyCapabilities,
} from "../../test/fixtures";
import type { RestErrorDetailCode, SupplyResponse } from "../../api/models";

const COMMUNITY_ID = "c1";
const SUPPLY_ID = "supply-1";
const SERVER_MESSAGE = "TEST-SERVER-MESSAGE";
const GENERIC = "Ha habido un problema al cambiar el titular del punto de suministro. Por favor, inténtalo más tarde";
const mockErrorDispatch = vi.fn();
const mockSuccessDispatch = vi.fn();
const onClose = vi.fn();

vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));
vi.mock(import("../../context/success.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useSuccessDispatch: () => mockSuccessDispatch,
}));
vi.mock(import("./useSupplyInActiveCommunity"), () => ({ useSupplyInActiveCommunity: vi.fn() }));
// The roster is read under the active community's canManageMemberships.
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllCommunities: vi.fn(),
  useGetCommunityById: vi.fn(),
}));
vi.mock(import("../../api/memberships/memberships"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetMemberships: vi.fn(),
}));
// useGetSuppliesByUserId is read by the harness's real CommunityProvider; the
// community is seeded, so it stays unanswered. useGetAllUsers is stubbed so a
// test can prove the overlay never reads the platform-wide listing.
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllUsers: vi.fn(),
  useGetSuppliesByUserId: vi.fn(),
}));
// Mutation stubbed to assert its arguments; the spread keeps the query-key
// getters the actions layer invalidates with.
vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useTransferSupplyOwnership: vi.fn(),
}));

import { useGetAllCommunities, useGetCommunityById, type getCommunityById } from "../../api/communities/communities";
import { useGetMemberships, type getMemberships } from "../../api/memberships/memberships";
import { useGetAllUsers, useGetSuppliesByUserId } from "../../api/users/users";
import { useTransferSupplyOwnership } from "../../api/supplies/supplies";
import { useSupplyInActiveCommunity } from "./useSupplyInActiveCommunity";
import { SupplyTransferDialog } from "./SupplyTransferDialog";

// A roster of every state, received out of name order. The current owner is
// first by name, so leaving them out is visible.
const CURRENT_OWNER = buildMembership({
  id: "m-ana",
  user: { id: "u-ana" },
  communityId: COMMUNITY_ID,
  fullName: "Ana García",
  personalId: "11111111H",
});
const ACTIVE = buildMembership({
  id: "m-luis",
  user: { id: "u-luis" },
  communityId: COMMUNITY_ID,
  fullName: "Luis Pérez",
  personalId: "22222222J",
});
// Pending, in two different sub-states: invited with a usable link, and with no email.
const PENDING_INVITED = buildMembership({
  id: "m-beatriz",
  user: { id: "u-beatriz" },
  communityId: COMMUNITY_ID,
  fullName: "Beatriz Ruiz",
  personalId: "33333333P",
  acceptedAt: null,
  invitedAt: "2026-11-01T10:00:00Z",
  invitationExpiresAt: "2026-11-30T10:00:00Z",
});
const PENDING_NO_EMAIL = buildMembership({
  id: "m-carmen",
  user: { id: "u-carmen" },
  communityId: COMMUNITY_ID,
  fullName: "Carmen Soto",
  personalId: "44444444A",
  acceptedAt: null,
  contactEmail: null,
});
const SUSPENDED = buildMembership({
  id: "m-diego",
  user: { id: "u-diego" },
  communityId: COMMUNITY_ID,
  fullName: "Diego Vidal",
  personalId: "55555555K",
  enabled: false,
});
const ROSTER = [SUSPENDED, ACTIVE, CURRENT_OWNER, PENDING_NO_EMAIL, PENDING_INVITED];

const supplyWith = (overrides: Partial<SupplyResponse> = {}) =>
  buildSupply({
    id: SUPPLY_ID,
    code: "ES0021000000000000AA",
    name: "Casa de Ana",
    community: { id: COMMUNITY_ID, name: "Sol Común" },
    user: { id: CURRENT_OWNER.user.id },
    ownerRecord: buildMemberRecord({ fullName: "Ana García" }),
    capabilities: buildSupplyCapabilities({ canRead: true, canEdit: true, canTransferOwnership: true }),
    ...overrides,
  });

let mutateAsync: Mock;

function setup(supply: SupplyResponse = supplyWith()) {
  vi.mocked(useSupplyInActiveCommunity).mockReturnValue({
    supply,
    isLoading: false,
    isNotFound: false,
    error: null,
    refetch: vi.fn(),
  });
  return renderWithProviders(<SupplyTransferDialog supplyId={SUPPLY_ID} onClose={onClose} />, {
    activeCommunityId: COMMUNITY_ID,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mutateAsync = vi.fn().mockResolvedValue(supplyWith({ user: { id: ACTIVE.user.id } }));
  vi.mocked(useTransferSupplyOwnership).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useGetSuppliesByUserId).mockReturnValue(query.disabled());
  vi.mocked(useGetAllUsers).mockReturnValue(query.disabled());
  vi.mocked(useGetCommunityById).mockImplementation((communityId) =>
    query.success<typeof getCommunityById>(
      buildCommunity({
        id: communityId,
        name: "Sol Común",
        capabilities: buildCommunityCapabilities({ canManage: true, canManageMemberships: true }),
      }),
    ),
  );
  vi.mocked(useGetAllCommunities).mockReturnValue(query.disabled());
  vi.mocked(useGetMemberships).mockReturnValue(query.success<typeof getMemberships>(ROSTER));
});

afterEach(async () => {
  vi.useRealTimers();
  // An overlay left open gives its history entry back on unmount: let that
  // back land before the next test reads the history.
  cleanup();
  await act(() => overlayHistorySettled());
});

const dialog = () => screen.getByRole("dialog", { name: "Cambiar titular" });
const picker = () => screen.getByRole("combobox", { name: /^Nuevo titular/ });
const submit = () => within(dialog()).getByRole("button", { name: "Cambiar titular" });
const section = (name: "Dia" | "Mes" | "Año") => within(dialog()).getByRole("spinbutton", { name });

async function choose(user: ReturnType<typeof userEvent.setup>, optionName: RegExp) {
  await user.click(picker());
  await user.click(await screen.findByRole("option", { name: optionName }));
}

async function typeDate(user: ReturnType<typeof userEvent.setup>, day: string, month: string, year: string) {
  await user.click(section("Dia"));
  await user.keyboard(day);
  await user.keyboard(month);
  await user.keyboard(year);
}

const refusal = (code: RestErrorDetailCode, status = 409) => apiError(status, { code, message: SERVER_MESSAGE });

describe("SupplyTransferDialog", () => {
  it("UI-SUP-024 opens in its own overlay, named \"Cambiar titular\", never the edit form", () => {
    setup();

    expect(dialog()).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /^CUPS/ })).not.toBeInTheDocument();
  });

  it("shows the current holder read-only, from the supply's member record", () => {
    setup();

    const current = within(dialog()).getByRole("textbox", { name: "Titular actual" });
    expect(current).toHaveValue("Ana García");
    expect(usesReadOnlyPresentation(current)).toBe(true);
  });

  it("shows \"-\" as the current holder of a supply with no owner", () => {
    setup(supplyWith({ user: null, ownerRecord: null }));

    expect(within(dialog()).getByRole("textbox", { name: "Titular actual" })).toHaveValue("-");
  });

  describe("the new holder", () => {
    it("UI-SUP-025 offers every other member, in any state, by name, and never the current owner", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(picker());
      const options = (await screen.findAllByRole("option")).map((option) => option.textContent);

      expect(options).toEqual([
        "Beatriz Ruiz (33333333P)· Pendiente",
        "Carmen Soto (44444444A)· Pendiente",
        "Diego Vidal (55555555K)· Suspendido",
        "Luis Pérez (22222222J)",
      ]);
    });

    it("UI-SUP-025 labels a pending member \"Pendiente\" whatever their sub-state, and never shows the sub-state", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(picker());

      expect(await screen.findByRole("option", { name: /^Beatriz Ruiz .*Pendiente$/ })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /^Carmen Soto .*Pendiente$/ })).toBeInTheDocument();
      expect(screen.queryByText(/Invitación enviada|Sin email/)).not.toBeInTheDocument();
    });

    it("UI-SUP-025 UI-SUP-017 says the community has nobody else, and sends nothing", async () => {
      vi.mocked(useGetMemberships).mockReturnValue(query.success<typeof getMemberships>([CURRENT_OWNER]));
      setup();

      expect(
        within(dialog()).getByText("No hay ningún otro miembro en esta comunidad al que cambiar el titular."),
      ).toBeVisible();
      expect(submit()).toBeDisabled();
    });

    it("UI-SUP-025 UI-SUP-017 says the members could not be loaded, and sends nothing", () => {
      vi.mocked(useGetMemberships).mockReturnValue(query.error(new Error("TEST-READ-FAILED")));
      setup();

      expect(
        within(dialog()).getByText("No se pudieron cargar los miembros de esta comunidad. Inténtalo más tarde."),
      ).toBeVisible();
      expect(submit()).toBeDisabled();
    });

    it("UI-SUP-025 UI-SUP-018 reads the roster through getMemberships, never the platform-wide user listing", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(picker());

      expect(useGetMemberships).toHaveBeenCalledWith(COMMUNITY_ID, expect.anything());
      expect(useGetAllUsers).not.toHaveBeenCalled();
    });

    it("sends nothing until a new holder is chosen", () => {
      setup();

      expect(submit()).toBeDisabled();
    });
  });

  it("UI-SUP-026 states the four consequences as plain text, never as an alert or a note", () => {
    setup();

    const items = within(dialog()).getAllByRole("listitem").map((item) => item.textContent);
    expect(items).toEqual([
      "El nuevo titular verá todo el histórico de este punto: consumo, ahorro y coeficientes.",
      "El titular anterior dejará de ver este punto y sus cifras dejarán de incluirlo, también las de meses pasados.",
      "Para que sigan llegando sus datos, el nuevo titular debe autorizar a la comunidad en Datadis.",
      "La inversión no se traspasa. Si corresponde, regístrala en la ficha del nuevo titular.",
    ]);
    for (const item of within(dialog()).getAllByRole("listitem")) {
      expect(item).toBeVisible();
      expect(item.closest('[role="alert"], [role="note"]')).toBeNull();
    }
  });

  describe("the date", () => {
    it("UI-SUP-027 defaults to today in the app's time zone", () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-03-14T12:00:00Z"));
      setup();

      expect(section("Dia")).toHaveTextContent("14");
      expect(section("Mes")).toHaveTextContent("03");
      expect(section("Año")).toHaveTextContent("2026");
    });

    it("UI-SUP-027 refuses a future date with visible text, and sends nothing", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-03-14T12:00:00Z"));
      const user = userEvent.setup();
      setup();
      await choose(user, /^Luis Pérez/);

      await typeDate(user, "15", "03", "2026");

      expect(within(dialog()).getByText("La fecha del cambio no puede ser posterior a hoy.")).toBeVisible();
      expect(submit()).toBeDisabled();
      await user.click(submit());
      expect(mutateAsync).not.toHaveBeenCalled();
    });

    it("UI-SUP-027 accepts a date before today", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-03-14T12:00:00Z"));
      const user = userEvent.setup();
      setup();
      await choose(user, /^Luis Pérez/);

      await typeDate(user, "01", "02", "2026");
      await user.click(submit());

      await waitFor(() =>
        expect(mutateAsync).toHaveBeenCalledWith({
          supplyId: SUPPLY_ID,
          data: { newOwnerPersonalId: "22222222J", effectiveDate: "2026-02-01" },
        }),
      );
    });
  });

  it("sends the chosen membership's personal ID and the date, closes, and says who holds the supply now", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-14T12:00:00Z"));
    const user = userEvent.setup();
    setup();

    await choose(user, /^Diego Vidal/);
    await user.click(submit());

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledWith({
      supplyId: SUPPLY_ID,
      data: { newOwnerPersonalId: "55555555K", effectiveDate: "2026-03-14" },
    });
    expect(mockSuccessDispatch).toHaveBeenCalledWith("Titular de «Casa de Ana» cambiado a «Diego Vidal».");
  });

  describe("a refused transfer", () => {
    it.each<[RestErrorDetailCode, string]>([
      ["SUPPLY_TRANSFER_DATE_IN_FUTURE", "La fecha del cambio no puede ser posterior a hoy."],
      [
        "SUPPLY_TRANSFER_DATE_NOT_AFTER_PREVIOUS",
        "La fecha tiene que ser posterior a la del último cambio de titular de este punto.",
      ],
    ])("UI-SUP-027 shows %s on the date, keeps the overlay open and focuses the date", async (code, message) => {
      mutateAsync.mockRejectedValue(refusal(code, code === "SUPPLY_TRANSFER_DATE_IN_FUTURE" ? 400 : 409));
      const user = userEvent.setup();
      setup();
      await choose(user, /^Luis Pérez/);

      await user.click(submit());

      const helper = await within(dialog()).findByText(message);
      expect(helper.closest(".MuiFormControl-root")).toContainElement(section("Dia"));
      await waitFor(() => expect(section("Dia")).toHaveFocus());
      expect(onClose).not.toHaveBeenCalled();
      expect(picker()).toHaveValue("Luis Pérez (22222222J)");
    });

    it.each<[RestErrorDetailCode, string]>([
      ["SUPPLY_ALREADY_OWNED_BY_USER", "Este miembro ya es el titular del punto."],
      ["SUPPLY_OWNER_NOT_FOUND", "No hay ningún miembro de la comunidad con ese DNI/NIE/NIF."],
    ])("UI-SUP-027 UI-SUP-009 shows %s on the picker, keeps the overlay open and focuses the picker", async (code, message) => {
      mutateAsync.mockRejectedValue(refusal(code, code === "SUPPLY_OWNER_NOT_FOUND" ? 404 : 409));
      const user = userEvent.setup();
      setup();
      await choose(user, /^Luis Pérez/);

      await user.click(submit());

      expect(await within(dialog()).findByText(message)).toBeVisible();
      expect(picker()).toHaveAccessibleDescription(message);
      await waitFor(() => expect(picker()).toHaveFocus());
      expect(onClose).not.toHaveBeenCalled();
    });

    it("keeps any other refusal generic, and the overlay open", async () => {
      mutateAsync.mockRejectedValue(apiError(500, { message: SERVER_MESSAGE }));
      const user = userEvent.setup();
      setup();
      await choose(user, /^Luis Pérez/);

      await user.click(submit());

      await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalledWith(GENERIC));
      expect(onClose).not.toHaveBeenCalled();
      expect(dialog()).toBeInTheDocument();
    });
  });

  it("UI-OVL-002 sends once and locks the overlay while the transfer is in flight", async () => {
    let settle: (value: SupplyResponse) => void = () => {};
    mutateAsync.mockReturnValue(new Promise<SupplyResponse>((resolve) => (settle = resolve)));
    const user = userEvent.setup();
    setup();
    await choose(user, /^Luis Pérez/);

    await user.click(submit());

    const pending = within(dialog()).getByRole("button", { name: "Cambiando titular..." });
    expect(pending).toBeDisabled();
    expect(within(dialog()).getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(picker()).toHaveAttribute("readonly");
    await user.keyboard("{Escape}");
    expect(dialog()).toBeInTheDocument();
    expect(mutateAsync).toHaveBeenCalledTimes(1);

    await act(async () => settle(supplyWith()));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("UI-OVL-003 asks before discarding a chosen holder", async () => {
    const user = userEvent.setup();
    setup();
    await choose(user, /^Luis Pérez/);

    await user.click(within(dialog()).getByRole("button", { name: "Cancelar" }));

    expect(onClose).not.toHaveBeenCalled();
    expect(within(dialog()).getByRole("button", { name: "Descartar cambios" })).toBeInTheDocument();
  });

  it("UI-OVL-004 closes on back when nothing was changed", async () => {
    setup();
    await act(() => overlayHistorySettled());

    await pressBack();

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
