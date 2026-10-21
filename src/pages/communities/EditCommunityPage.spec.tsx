import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { useGetCommunityById, useUpdateCommunity, type getCommunityById } from "../../api/communities/communities";
import { apiError } from "../../test/apiError";
import { buildCommunity, buildCommunityCapabilities } from "../../test/fixtures";
import { mutation, query } from "../../test/queryState";
import { renderWithProviders } from "../../test/renderWithProviders";
import { EditCommunityPage } from "./EditCommunityPage";

const mockErrorDispatch = vi.fn();

vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
  useUpdateCommunity: vi.fn(),
}));

const SERVER_MESSAGE = "TEST-SERVER-MESSAGE";

let mutateAsync: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockErrorDispatch.mockClear();
  mutateAsync = vi.fn();
  vi.mocked(useUpdateCommunity).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useGetCommunityById).mockReturnValue(
    query.success<typeof getCommunityById>(
      buildCommunity({
        name: "Comunidad Norte",
        code: "NORTE",
        legalId: "G12345678",
        address: "Calle Mayor 1",
        capabilities: buildCommunityCapabilities({ canUpdate: true }),
      }),
    ),
  );
});

const codeInput = () => screen.getByRole("textbox", { name: /^Código/ });
const legalIdInput = () => screen.getByRole("textbox", { name: /^NIF\/CIF/ });

async function editAndSubmit(u: ReturnType<typeof userEvent.setup>) {
  await u.clear(codeInput());
  await u.type(codeInput(), "SUR");
  await u.clear(legalIdInput());
  await u.type(legalIdInput(), "G87654321");
  await u.click(screen.getByRole("button", { name: "Guardar cambios" }));
}

function expectTypedValuesKept() {
  expect(screen.getByRole("textbox", { name: /^Nombre/ })).toHaveValue("Comunidad Norte");
  expect(codeInput()).toHaveValue("SUR");
  expect(legalIdInput()).toHaveValue("G87654321");
  expect(screen.getByRole("textbox", { name: /^Dirección/ })).toHaveValue("Calle Mayor 1");
}

const duplicate = (params?: Record<string, string>) =>
  apiError(409, { code: "COMMUNITY_ALREADY_EXISTS", message: SERVER_MESSAGE, ...(params ? { params } : {}) });

describe("EditCommunityPage: a refused edit (#232)", () => {
  it("UI-ERR-002 shows a duplicate code on the Código input and keeps every typed value", async () => {
    mutateAsync.mockRejectedValue(duplicate({ field: "code", value: "SUR" }));
    const u = userEvent.setup();
    renderWithProviders(<EditCommunityPage />);

    await editAndSubmit(u);

    await waitFor(() => expect(codeInput()).toHaveAccessibleDescription("Ya hay otra comunidad con ese código."));
    expect(codeInput()).toBeInvalid();
    expect(legalIdInput()).toBeValid();
    expect(screen.queryByText(SERVER_MESSAGE)).not.toBeInTheDocument();
    expect(mockErrorDispatch).not.toHaveBeenCalled();
    expectTypedValuesKept();
  });

  it("UI-ERR-002 shows a duplicate NIF on the NIF/CIF input and keeps every typed value", async () => {
    mutateAsync.mockRejectedValue(duplicate({ field: "legalId", value: "G87654321" }));
    const u = userEvent.setup();
    renderWithProviders(<EditCommunityPage />);

    await editAndSubmit(u);

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
    renderWithProviders(<EditCommunityPage />);

    await editAndSubmit(u);

    await waitFor(() =>
      expect(mockErrorDispatch).toHaveBeenCalledWith("Ya hay otra comunidad con ese código o ese NIF."),
    );
    expect(mockErrorDispatch).not.toHaveBeenCalledWith(SERVER_MESSAGE);
    expectTypedValuesKept();
  });

  it("UI-ERR-002 clears the API error once its input is edited, not when another input is", async () => {
    mutateAsync.mockRejectedValue(duplicate({ field: "legalId" }));
    const u = userEvent.setup();
    renderWithProviders(<EditCommunityPage />);
    await editAndSubmit(u);
    await waitFor(() => expect(legalIdInput()).toBeInvalid());

    await u.type(codeInput(), "2");
    expect(legalIdInput()).toBeInvalid();

    await u.type(legalIdInput(), "0");
    expect(legalIdInput()).toBeValid();
    expect(legalIdInput()).not.toHaveAccessibleDescription("Ya hay otra comunidad con ese NIF.");
    expect(codeInput()).toHaveValue("SUR2");
    expect(legalIdInput()).toHaveValue("G876543210");
  });
});
