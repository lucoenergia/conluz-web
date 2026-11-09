import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  useGetCommunityById,
  useGetCommunityContact,
  useUpdateCommunity,
  type getCommunityById,
} from "../../api/communities/communities";
import type { CommunityResponse } from "../../api/models";
import { apiError } from "../../test/apiError";
import { buildCommunity, buildCommunityCapabilities } from "../../test/fixtures";
import { mutation, query } from "../../test/queryState";
import { renderWithProviders } from "../../test/renderWithProviders";
import { CommunityFormDialog } from "./CommunityFormDialog";

/**
 * The community form in edit mode (#374): what it loads, what it sends, what
 * it says about wrong input, where a refusal lands, and its lock while it
 * saves. Where it opens from, its overlay behaviour over the list and the
 * seeding under a refetch are CommunitiesPage.communityForm.spec.tsx's.
 *
 * Reads stubbed, the mutation stubbed only to hold or refuse it: the gate
 * under test lives inside useCommunityActions, on the community's canUpdate.
 */
const mockErrorDispatch = vi.fn();

vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
  useUpdateCommunity: vi.fn(),
  // Mocked only to prove the edit form never asks for the contact (#374).
  useGetCommunityContact: vi.fn(),
}));

const COMMUNITY_ID = "c2";
const TITLE = "Editar comunidad";
const GENERIC = "Ha habido un problema al editar la comunidad. Por favor, inténtalo más tarde.";

const theCommunity = (canUpdate = true, overrides: Partial<CommunityResponse> = {}) =>
  buildCommunity({
    id: COMMUNITY_ID,
    name: "Verde Activa",
    code: "VRD",
    legalId: "G87654321",
    address: "Plaza Verde 2",
    capabilities: buildCommunityCapabilities({ canRead: true, canUpdate }),
    ...overrides,
  });

let mutateAsync: Mock;
const onClose = vi.fn();

function setup(read: ReturnType<typeof useGetCommunityById> = query.success<typeof getCommunityById>(theCommunity())) {
  vi.mocked(useGetCommunityById).mockReturnValue(read);
  vi.mocked(useUpdateCommunity).mockReturnValue(mutation.idle({ mutateAsync }));
  return renderWithProviders(
    <CommunityFormDialog target={{ kind: "edit", communityId: COMMUNITY_ID }} onClose={onClose} />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mutateAsync = vi.fn().mockResolvedValue(theCommunity());
  vi.mocked(useGetCommunityContact).mockReturnValue(query.loading());
});

const nameInput = () => screen.getByRole("textbox", { name: /^Nombre/ });
const codeInput = () => screen.getByRole("textbox", { name: /^Código/ });
const legalIdInput = () => screen.getByRole("textbox", { name: /^NIF\/CIF/ });
const addressInput = () => screen.getByRole("textbox", { name: /^Dirección/ });
const saveButton = () => screen.getByRole("button", { name: "Guardar" });

describe("CommunityFormDialog: editing", () => {
  it("UI-OVL-006 is a dialog named by its title", () => {
    setup();

    expect(screen.getByRole("dialog", { name: TITLE })).toBeInTheDocument();
  });

  it("UI-COM-001 opens with the community's own values, read from the community it was opened for", () => {
    setup();

    expect(vi.mocked(useGetCommunityById)).toHaveBeenCalledWith(COMMUNITY_ID);
    expect(nameInput()).toHaveValue("Verde Activa");
    expect(codeInput()).toHaveValue("VRD");
    expect(legalIdInput()).toHaveValue("G87654321");
    expect(addressInput()).toHaveValue("Plaza Verde 2");
  });

  it("saves through the action when the community permits updating it, and closes", async () => {
    const u = userEvent.setup();
    setup();

    await u.clear(addressInput());
    await u.click(saveButton());

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledWith({
      communityId: COMMUNITY_ID,
      data: { name: "Verde Activa", code: "VRD", legalId: "G87654321", address: undefined },
    });
  });

  it("offers no way to submit when the community does not permit updating it", () => {
    setup(query.success<typeof getCommunityById>(theCommunity(false)));

    expect(saveButton()).toBeDisabled();
  });

  // Editing is not creating, whatever the community is called.
  it("UI-COM-004 reads Guardar, whatever the community is called", () => {
    setup(query.success<typeof getCommunityById>(theCommunity(true, { name: "Crear comunidad" })));

    expect(saveButton()).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Crear/ })).not.toBeInTheDocument();
  });

  it("UI-CTU-004 shows no contact section, and does not ask for the contact", () => {
    setup();

    expect(screen.queryByRole("region", { name: "Contacto de la comunidad" })).not.toBeInTheDocument();
    expect(screen.queryByText("Contacto")).not.toBeInTheDocument();
    expect(screen.queryByText("Esta comunidad aún no ha configurado su contacto.")).not.toBeInTheDocument();
    expect(vi.mocked(useGetCommunityContact)).not.toHaveBeenCalled();
  });

  describe("while the community cannot be shown", () => {
    it("UI-COM-001 shows a spinner, labelled, and no fields while it loads", () => {
      setup(query.loading());

      expect(screen.getByRole("progressbar", { name: "Cargando..." })).toBeInTheDocument();
      expect(screen.queryByRole("textbox", { name: /^Nombre/ })).not.toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
    });

    it("UI-COM-001 shows the not-found state, and no fields, for a community that is missing or hidden", () => {
      setup(query.error(apiError(404)));

      expect(screen.getByText("Comunidad no encontrada")).toBeInTheDocument();
      expect(screen.getByText("Esta comunidad no existe o no tienes acceso a ella.")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
      expect(screen.queryByRole("textbox", { name: /^Nombre/ })).not.toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
    });

    it("UI-COM-001 says a failed read failed, and reads it again on Reintentar", async () => {
      const u = userEvent.setup();
      const failed = query.error(apiError(500));
      setup(failed);

      expect(screen.getByText("No se pudo cargar la información de la comunidad.")).toBeInTheDocument();
      expect(screen.queryByText("Comunidad no encontrada")).not.toBeInTheDocument();
      await u.click(screen.getByRole("button", { name: "Reintentar" }));
      expect(failed.refetch).toHaveBeenCalledTimes(1);
    });
  });
});

describe("UI-COM-002 an invalid edit sends nothing", () => {
  it.each([
    ["an empty Nombre", true, false, ["El nombre es obligatorio"], /^Nombre/],
    ["an empty Código", false, true, ["El código es obligatorio"], /^Código/],
    ["both empty", true, true, ["El nombre es obligatorio", "El código es obligatorio"], /^Nombre/],
  ] as const)(
    "UI-COM-002 with %s, shows each error on its field and focuses the first failing one",
    async (_, clearName, clearCode, errors, firstFailing) => {
      const u = userEvent.setup();
      setup();
      if (clearName) await u.clear(nameInput());
      if (clearCode) await u.clear(codeInput());
      // Focus elsewhere, so the focus asserted below is the form's doing.
      await u.click(addressInput());

      await u.click(saveButton());

      expect(mutateAsync).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      for (const error of errors) expect(screen.getByText(error)).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: firstFailing })).toBeInvalid();
      expect(screen.getByRole("textbox", { name: firstFailing })).toHaveFocus();
    },
  );
});

describe("UI-COM-003 while the edit is in flight", () => {
  const holdSave = () => {
    let settle: () => void = () => {};
    mutateAsync.mockImplementation(() => new Promise((resolve) => (settle = () => resolve(theCommunity()))));
    return () => settle();
  };

  it("UI-COM-003 sends one request however often it is submitted, and reads Guardando...", async () => {
    const settle = holdSave();
    const u = userEvent.setup();
    setup();

    const form = screen.getByRole("dialog", { name: TITLE }).querySelector("form") ?? saveButton().closest("form")!;
    await u.click(saveButton());
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(screen.getByRole("button", { name: "Guardando..." })).toBeDisabled();
    expect(mutateAsync).toHaveBeenCalledTimes(1);

    await act(async () => settle());
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("UI-COM-003 makes every input read-only, and Cancelar disabled", async () => {
    holdSave();
    const u = userEvent.setup();
    setup();

    await u.click(saveButton());

    for (const input of [nameInput(), codeInput(), legalIdInput(), addressInput()]) {
      expect(input).toHaveAttribute("readonly");
    }
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  });
});

describe("a refused edit (#232)", () => {
  const duplicate = (field: string) =>
    apiError(409, { code: "COMMUNITY_ALREADY_EXISTS", message: "TEST-SERVER-MESSAGE", params: { field } });

  it.each([
    ["code", codeInput, "Ya hay otra comunidad con ese código.", legalIdInput],
    ["legalId", legalIdInput, "Ya hay otra comunidad con ese NIF.", codeInput],
  ] as const)(
    "UI-ERR-002 shows a duplicate %s on its input, focuses it, and keeps every typed value",
    async (field, input, message, other) => {
      mutateAsync.mockRejectedValue(duplicate(field));
      const u = userEvent.setup();
      setup();
      await u.type(input(), "2");

      await u.click(saveButton());

      await waitFor(() => expect(input()).toHaveAccessibleDescription(message));
      expect(input()).toBeInvalid();
      expect(input()).toHaveFocus();
      expect(other()).toBeValid();
      expect(mockErrorDispatch).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      expect(input()).toHaveValue(field === "code" ? "VRD2" : "G876543212");
      expect(nameInput()).toHaveValue("Verde Activa");
    },
  );

  it("UI-ERR-001 shows the catalogue's fallback in the snackbar when the duplicate names no field", async () => {
    mutateAsync.mockRejectedValue(apiError(409, { code: "COMMUNITY_ALREADY_EXISTS" }));
    const u = userEvent.setup();
    setup();

    await u.click(saveButton());

    await waitFor(() =>
      expect(mockErrorDispatch).toHaveBeenCalledWith("Ya hay otra comunidad con ese código o ese NIF."),
    );
  });

  it("keeps the generic message for a refusal that is not a duplicate, and stays open with the input", async () => {
    mutateAsync.mockRejectedValue(apiError(500));
    const u = userEvent.setup();
    setup();
    await u.type(addressInput(), ", bajo");

    await u.click(saveButton());

    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalledWith(GENERIC));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: TITLE })).toBeInTheDocument();
    expect(addressInput()).toHaveValue("Plaza Verde 2, bajo");
  });
});
