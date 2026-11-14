import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCreateCommunity } from "../../api/communities/communities";
import { useGetCurrentUser, type getCurrentUser } from "../../api/users/users";
import { apiError } from "../../test/apiError";
import { buildCommunity, buildCurrentUser, buildPlatformCapabilities } from "../../test/fixtures";
import { mutation, query } from "../../test/queryState";
import { renderWithProviders } from "../../test/renderWithProviders";
import { CommunityFormDialog } from "./CommunityFormDialog";

/**
 * The community form in create mode (#374): what it sends, what it says
 * about wrong input, where a refusal lands, and its lock while it saves.
 * Where it opens from and its overlay behaviour over a page are
 * CommunitiesPage.communityForm.spec.tsx's and PlatformPage.communityForm.spec.tsx's.
 *
 * Reads stubbed, the mutation stubbed only to hold or refuse it: the gate
 * under test lives inside usePlatformActions.
 */
const mockErrorDispatch = vi.fn();

vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useCreateCommunity: vi.fn(),
}));
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCurrentUser: vi.fn(),
}));

const TITLE = "Crear nueva comunidad";
const SERVER_MESSAGE = "TEST-SERVER-MESSAGE";
const GENERIC = "Ha habido un problema al crear la comunidad. Por favor, inténtalo más tarde.";

let mutateAsync: Mock;
const onClose = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mutateAsync = vi.fn().mockResolvedValue(buildCommunity({ id: "c-new", name: "Comunidad Norte" }));
  vi.mocked(useCreateCommunity).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useGetCurrentUser).mockReturnValue(
    query.success<typeof getCurrentUser>(
      buildCurrentUser({ platformCapabilities: buildPlatformCapabilities({ canCreateCommunity: true }) }),
    ),
  );
});

const renderDialog = () =>
  renderWithProviders(<CommunityFormDialog target={{ kind: "create" }} onClose={onClose} />, { token: "a-token" });

const nameInput = () => screen.getByRole("textbox", { name: /^Nombre/ });
const codeInput = () => screen.getByRole("textbox", { name: /^Código/ });
const legalIdInput = () => screen.getByRole("textbox", { name: /^NIF\/CIF/ });
const addressInput = () => screen.getByRole("textbox", { name: /^Dirección/ });
const submit = () => screen.getByRole("button", { name: "Crear comunidad" });

async function fill(u: ReturnType<typeof userEvent.setup>) {
  await u.type(nameInput(), "Comunidad Norte");
  await u.type(codeInput(), "NORTE");
  await u.type(legalIdInput(), "G12345678");
  await u.type(addressInput(), "Calle Mayor 1");
}

async function fillAndSubmit(u: ReturnType<typeof userEvent.setup>) {
  await fill(u);
  await u.click(submit());
}

function expectTypedValuesKept() {
  expect(nameInput()).toHaveValue("Comunidad Norte");
  expect(codeInput()).toHaveValue("NORTE");
  expect(legalIdInput()).toHaveValue("G12345678");
  expect(addressInput()).toHaveValue("Calle Mayor 1");
}

const duplicate = (params?: Record<string, string>) =>
  apiError(409, { code: "COMMUNITY_ALREADY_EXISTS", message: SERVER_MESSAGE, ...(params ? { params } : {}) });

describe("CommunityFormDialog: creating", () => {
  it("UI-OVL-006 is a dialog named by its title", () => {
    renderDialog();

    expect(screen.getByRole("dialog", { name: TITLE })).toBeInTheDocument();
  });

  it("opens empty, and sends what was typed, an empty optional input as no value, then closes", async () => {
    const u = userEvent.setup();
    renderDialog();
    for (const input of [nameInput(), codeInput(), legalIdInput(), addressInput()]) expect(input).toHaveValue("");

    await u.type(nameInput(), "  Comunidad Norte ");
    await u.type(codeInput(), "NORTE");
    await u.click(submit());

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledWith({
      data: { name: "Comunidad Norte", code: "NORTE", legalId: undefined, address: undefined },
    });
  });
});

describe("UI-COM-002 an invalid create sends nothing", () => {
  it.each([
    ["an empty Nombre", "", "NORTE", ["El nombre es obligatorio"], /^Nombre/],
    ["an empty Código", "Comunidad Norte", "", ["El código es obligatorio"], /^Código/],
    ["both empty", "", "", ["El nombre es obligatorio", "El código es obligatorio"], /^Nombre/],
  ] as const)(
    "UI-COM-002 with %s, shows each error on its field and focuses the first failing one",
    async (_, name, code, errors, firstFailing) => {
      const u = userEvent.setup();
      renderDialog();
      if (name) await u.type(nameInput(), name);
      if (code) await u.type(codeInput(), code);
      await u.type(addressInput(), "Calle Mayor 1");

      await u.click(submit());

      expect(mutateAsync).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      for (const error of errors) expect(screen.getByText(error)).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: firstFailing })).toBeInvalid();
      expect(screen.getByRole("textbox", { name: firstFailing })).toHaveFocus();
    },
  );

  // A blank name is no name: what is sent is trimmed, so blanks must fail too.
  it("UI-COM-002 counts a Nombre of blanks as empty", async () => {
    const u = userEvent.setup();
    renderDialog();
    await u.type(nameInput(), "   ");
    await u.type(codeInput(), "NORTE");

    await u.click(submit());

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(nameInput()).toHaveAccessibleDescription("El nombre es obligatorio");
    expect(nameInput()).toHaveFocus();
  });
});

describe("UI-COM-003 while the create is in flight", () => {
  const holdSave = () => {
    let settle: () => void = () => {};
    mutateAsync.mockImplementation(
      () => new Promise((resolve) => (settle = () => resolve(buildCommunity({ id: "c-new" })))),
    );
    return () => settle();
  };

  it("UI-COM-003 sends one request however often it is submitted, and reads Creando...", async () => {
    const settle = holdSave();
    const u = userEvent.setup();
    renderDialog();
    await fill(u);

    await u.click(submit());
    const form = screen.getByRole("dialog", { name: TITLE }).querySelector("form") ?? submit().closest("form")!;
    // The button is disabled now; a submit by Enter or a second dispatch is what is left.
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(screen.getByRole("button", { name: "Creando..." })).toBeDisabled();
    expect(mutateAsync).toHaveBeenCalledTimes(1);

    await act(async () => settle());
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("UI-COM-003 makes every input read-only, and Cancelar disabled", async () => {
    holdSave();
    const u = userEvent.setup();
    renderDialog();
    await fill(u);

    await u.click(submit());

    for (const input of [nameInput(), codeInput(), legalIdInput(), addressInput()]) {
      expect(input).toHaveAttribute("readonly");
    }
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  });
});

describe("a refused create (#232)", () => {
  it("UI-ERR-002 shows a duplicate code on the Código input, focuses it, and keeps every typed value", async () => {
    mutateAsync.mockRejectedValue(duplicate({ field: "code", value: "NORTE" }));
    const u = userEvent.setup();
    renderDialog();

    await fillAndSubmit(u);

    await waitFor(() => expect(codeInput()).toHaveAccessibleDescription("Ya hay otra comunidad con ese código."));
    expect(codeInput()).toBeInvalid();
    expect(codeInput()).toHaveFocus();
    expect(legalIdInput()).toBeValid();
    expect(screen.queryByText(SERVER_MESSAGE)).not.toBeInTheDocument();
    expect(mockErrorDispatch).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expectTypedValuesKept();
  });

  it("UI-ERR-002 shows a duplicate NIF on the NIF/CIF input, focuses it, and keeps every typed value", async () => {
    mutateAsync.mockRejectedValue(duplicate({ field: "legalId", value: "G12345678" }));
    const u = userEvent.setup();
    renderDialog();

    await fillAndSubmit(u);

    await waitFor(() => expect(legalIdInput()).toHaveAccessibleDescription("Ya hay otra comunidad con ese NIF."));
    expect(legalIdInput()).toBeInvalid();
    expect(legalIdInput()).toHaveFocus();
    expect(codeInput()).toBeValid();
    expect(mockErrorDispatch).not.toHaveBeenCalled();
    expectTypedValuesKept();
  });

  it("UI-ERR-001 shows the catalogue's fallback in the snackbar when the duplicate names no field", async () => {
    mutateAsync.mockRejectedValue(duplicate());
    const u = userEvent.setup();
    renderDialog();

    await fillAndSubmit(u);

    await waitFor(() =>
      expect(mockErrorDispatch).toHaveBeenCalledWith("Ya hay otra comunidad con ese código o ese NIF."),
    );
    expect(mockErrorDispatch).not.toHaveBeenCalledWith(SERVER_MESSAGE);
    expect(codeInput()).toBeValid();
    expect(legalIdInput()).toBeValid();
    expectTypedValuesKept();
  });

  it("UI-ERR-001 shows the catalogue's fallback when the duplicate names a field the form does not have", async () => {
    mutateAsync.mockRejectedValue(duplicate({ field: "name" }));
    const u = userEvent.setup();
    renderDialog();

    await fillAndSubmit(u);

    await waitFor(() =>
      expect(mockErrorDispatch).toHaveBeenCalledWith("Ya hay otra comunidad con ese código o ese NIF."),
    );
    expectTypedValuesKept();
  });

  it("UI-ERR-002 clears the API error once its input is edited, not when another input is", async () => {
    mutateAsync.mockRejectedValue(duplicate({ field: "code" }));
    const u = userEvent.setup();
    renderDialog();
    await fillAndSubmit(u);
    await waitFor(() => expect(codeInput()).toBeInvalid());

    await u.type(legalIdInput(), "9");
    expect(codeInput()).toBeInvalid();
    expect(codeInput()).toHaveAccessibleDescription("Ya hay otra comunidad con ese código.");

    await u.type(codeInput(), "2");
    expect(codeInput()).toBeValid();
    expect(codeInput()).toHaveAccessibleDescription("Identificador corto único para la comunidad");
    expect(codeInput()).toHaveValue("NORTE2");
    expect(legalIdInput()).toHaveValue("G123456789");
    expect(nameInput()).toHaveValue("Comunidad Norte");
    expect(addressInput()).toHaveValue("Calle Mayor 1");
  });

  it("keeps the generic message for a refusal that is not a duplicate, and stays open", async () => {
    mutateAsync.mockRejectedValue(apiError(500, { message: SERVER_MESSAGE }));
    const u = userEvent.setup();
    renderDialog();

    await fillAndSubmit(u);

    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalledWith(GENERIC));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: TITLE })).toBeInTheDocument();
    expect(submit()).toBeEnabled();
    expectTypedValuesKept();
  });
});

describe("the community's address (#411)", () => {
  const tooLong = (params: Record<string, string>) =>
    apiError(400, { code: "FIELD_TOO_LONG", message: SERVER_MESSAGE, params });

  it("UI-FRM-001 refuses the 251st character", async () => {
    const u = userEvent.setup();
    renderDialog();

    await u.click(addressInput());
    await u.paste("a".repeat(250));
    await u.type(addressInput(), "b");

    expect(addressInput()).toHaveValue("a".repeat(250));
  });

  it("UI-FRM-002 Enter in the address submits the form, and adds no line break", async () => {
    const u = userEvent.setup();
    renderDialog();
    await fill(u);

    await u.type(addressInput(), "{Enter}");

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync.mock.calls[0][0].data.address).toBe("Calle Mayor 1");
  });

  it("UI-ERR-002 UI-ERR-007 shows FIELD_TOO_LONG on the address input, focuses it, and keeps every typed value", async () => {
    mutateAsync.mockRejectedValue(tooLong({ field: "address", maxLength: "250", n: "251" }));
    const u = userEvent.setup();
    renderDialog();

    await fillAndSubmit(u);

    await waitFor(() =>
      expect(addressInput()).toHaveAccessibleDescription(
        "La dirección puede tener como máximo 250 caracteres. Ahora tiene 251.",
      ),
    );
    expect(addressInput()).toBeInvalid();
    expect(addressInput()).toHaveFocus();
    expect(codeInput()).toBeValid();
    expect(mockErrorDispatch).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expectTypedValuesKept();
  });

  it("UI-ERR-002 clears the address error once the address is edited, not when another input is", async () => {
    mutateAsync.mockRejectedValue(tooLong({ field: "address", maxLength: "250", n: "251" }));
    const u = userEvent.setup();
    renderDialog();
    await fillAndSubmit(u);
    await waitFor(() => expect(addressInput()).toBeInvalid());

    await u.type(nameInput(), "s");
    expect(addressInput()).toBeInvalid();

    await u.type(addressInput(), "X");
    expect(addressInput()).toBeValid();
    expect(addressInput()).not.toHaveAccessibleDescription();
  });

  it("UI-ERR-007 keeps the generic message when FIELD_TOO_LONG names another field", async () => {
    mutateAsync.mockRejectedValue(tooLong({ field: "name", maxLength: "100", n: "101" }));
    const u = userEvent.setup();
    renderDialog();

    await fillAndSubmit(u);

    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalledWith(GENERIC));
    expect(addressInput()).toBeValid();
    expectTypedValuesKept();
  });
});
