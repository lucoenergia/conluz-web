import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { useCreateCommunity } from "../../api/communities/communities";
import { useGetCurrentUser, type getCurrentUser } from "../../api/users/users";
import { apiError } from "../../test/apiError";
import { buildCurrentUser, buildPlatformCapabilities } from "../../test/fixtures";
import { mutation, query } from "../../test/queryState";
import { renderWithProviders } from "../../test/renderWithProviders";
import { CreateCommunityPage } from "./CreateCommunityPage";

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

const SERVER_MESSAGE = "TEST-SERVER-MESSAGE";
const GENERIC = "Ha habido un problema al crear la comunidad. Por favor, inténtalo más tarde.";

let mutateAsync: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockErrorDispatch.mockClear();
  mutateAsync = vi.fn();
  vi.mocked(useCreateCommunity).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useGetCurrentUser).mockReturnValue(
    query.success<typeof getCurrentUser>(
      buildCurrentUser({ platformCapabilities: buildPlatformCapabilities({ canCreateCommunity: true }) }),
    ),
  );
});

const nameInput = () => screen.getByRole("textbox", { name: /^Nombre/ });
const codeInput = () => screen.getByRole("textbox", { name: /^Código/ });
const legalIdInput = () => screen.getByRole("textbox", { name: /^NIF\/CIF/ });
const addressInput = () => screen.getByRole("textbox", { name: /^Dirección/ });

async function fillAndSubmit(u: ReturnType<typeof userEvent.setup>) {
  await u.type(nameInput(), "Comunidad Norte");
  await u.type(codeInput(), "NORTE");
  await u.type(legalIdInput(), "G12345678");
  await u.type(addressInput(), "Calle Mayor 1");
  await u.click(screen.getByRole("button", { name: "Crear comunidad" }));
}

function expectTypedValuesKept() {
  expect(nameInput()).toHaveValue("Comunidad Norte");
  expect(codeInput()).toHaveValue("NORTE");
  expect(legalIdInput()).toHaveValue("G12345678");
  expect(addressInput()).toHaveValue("Calle Mayor 1");
}

const duplicate = (params?: Record<string, string>) =>
  apiError(409, { code: "COMMUNITY_ALREADY_EXISTS", message: SERVER_MESSAGE, ...(params ? { params } : {}) });

describe("CreateCommunityPage: a refused creation (#232)", () => {
  it("UI-ERR-002 shows a duplicate code on the Código input and keeps every typed value", async () => {
    mutateAsync.mockRejectedValue(duplicate({ field: "code", value: "NORTE" }));
    const u = userEvent.setup();
    renderWithProviders(<CreateCommunityPage />);

    await fillAndSubmit(u);

    await waitFor(() => expect(codeInput()).toHaveAccessibleDescription("Ya hay otra comunidad con ese código."));
    expect(codeInput()).toBeInvalid();
    expect(legalIdInput()).toBeValid();
    expect(screen.queryByText(SERVER_MESSAGE)).not.toBeInTheDocument();
    expect(mockErrorDispatch).not.toHaveBeenCalled();
    expectTypedValuesKept();
  });

  it("UI-ERR-002 shows a duplicate NIF on the NIF/CIF input and keeps every typed value", async () => {
    mutateAsync.mockRejectedValue(duplicate({ field: "legalId", value: "G12345678" }));
    const u = userEvent.setup();
    renderWithProviders(<CreateCommunityPage />);

    await fillAndSubmit(u);

    await waitFor(() => expect(legalIdInput()).toHaveAccessibleDescription("Ya hay otra comunidad con ese NIF."));
    expect(legalIdInput()).toBeInvalid();
    expect(codeInput()).toBeValid();
    expect(screen.queryByText(SERVER_MESSAGE)).not.toBeInTheDocument();
    expect(mockErrorDispatch).not.toHaveBeenCalled();
    expectTypedValuesKept();
  });

  it("UI-ERR-001 shows the catalogue's fallback in the snackbar when the duplicate names no field", async () => {
    mutateAsync.mockRejectedValue(duplicate());
    const u = userEvent.setup();
    renderWithProviders(<CreateCommunityPage />);

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
    renderWithProviders(<CreateCommunityPage />);

    await fillAndSubmit(u);

    await waitFor(() =>
      expect(mockErrorDispatch).toHaveBeenCalledWith("Ya hay otra comunidad con ese código o ese NIF."),
    );
    expectTypedValuesKept();
  });

  it("UI-ERR-002 clears the API error once its input is edited, not when another input is", async () => {
    mutateAsync.mockRejectedValue(duplicate({ field: "code" }));
    const u = userEvent.setup();
    renderWithProviders(<CreateCommunityPage />);
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

  it("keeps the generic message for a refusal that is not a duplicate", async () => {
    mutateAsync.mockRejectedValue(apiError(500, { message: SERVER_MESSAGE }));
    const u = userEvent.setup();
    renderWithProviders(<CreateCommunityPage />);

    await fillAndSubmit(u);

    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalledWith(GENERIC));
    expectTypedValuesKept();
  });
});
