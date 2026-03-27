import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

// Mocks
const mockNavigate = vi.fn();
const mockErrorDispatch = vi.fn();
const mockMutateAsync = vi.fn();
const mockGetUserById = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ partnerId: "test-partner-id" }),
  };
});

vi.mock("../../api/users/users", () => ({
  useGetUserById: (id: string) => mockGetUserById(id),
  useUpdateUser: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

vi.mock("../../context/error.context", () => ({
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock("../../components/PartnerForm/PartnerForm", () => ({
  PartnerForm: ({ handleSubmit, submitLabel, initialValues, mode }: any) => (
    <div>
      <span data-testid="form-mode">{mode}</span>
      <span data-testid="form-initial-fullname">{initialValues?.fullName}</span>
      <span data-testid="form-initial-email">{initialValues?.email}</span>
      <button
        data-testid="mock-partner-form"
        onClick={() =>
          handleSubmit({
            fullName: initialValues?.fullName ?? "Updated Name",
            personalId: initialValues?.personalId ?? "12345678Z",
            email: initialValues?.email ?? "updated@example.com",
            address: initialValues?.address ?? "Updated Address",
            phoneNumber: initialValues?.phoneNumber ?? "600000000",
          })
        }
      >
        {submitLabel}
      </button>
    </div>
  ),
}));

// Imports after mocks
import { MemoryRouter } from "react-router";
import { EditPartnerPage } from "./EditPartner";

const mockPartnerData = {
  id: "test-partner-id",
  fullName: "María López",
  personalId: "87654321X",
  email: "maria@example.com",
  address: "Avenida Libertad 5",
  phoneNumber: "611987654",
  number: 7,
  role: "PARTNER" as const,
  enabled: true,
};

describe("EditPartnerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserById.mockReturnValue({ data: mockPartnerData, isLoading: false, error: null });
  });

  const setup = () => {
    render(
      <MemoryRouter>
        <EditPartnerPage />
      </MemoryRouter>,
    );
  };

  it("shows loading spinner while fetching partner data", () => {
    mockGetUserById.mockReturnValue({ data: null, isLoading: true, error: null });
    setup();

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByText("Editar socio")).not.toBeInTheDocument();
  });

  it("shows error alert when partner data cannot be loaded", () => {
    mockGetUserById.mockReturnValue({ data: null, isLoading: false, error: new Error("Not found") });
    setup();

    expect(screen.getByText("No se pudo cargar la información del socio")).toBeInTheDocument();
    expect(screen.queryByText("Editar socio")).not.toBeInTheDocument();
  });

  it("shows error alert when partner data is null without an error", () => {
    mockGetUserById.mockReturnValue({ data: null, isLoading: false, error: null });
    setup();

    expect(screen.getByText("No se pudo cargar la información del socio")).toBeInTheDocument();
  });

  it("renders page header and breadcrumb when data is loaded", () => {
    setup();

    expect(screen.getByText("Editar socio")).toBeInTheDocument();
    // partner name appears in header subtitle, breadcrumb and form mock — verify at least one presence
    expect(screen.getAllByText("María López").length).toBeGreaterThan(0);
    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.getByText("Socios")).toBeInTheDocument();
  });

  it("renders PartnerForm in edit mode with partner initial values", () => {
    setup();

    expect(screen.getByTestId("form-mode")).toHaveTextContent("edit");
    expect(screen.getByTestId("form-initial-fullname")).toHaveTextContent("María López");
    expect(screen.getByTestId("form-initial-email")).toHaveTextContent("maria@example.com");
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
  });

  it("calls updateUser with correct data and navigates to /partners on success", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce({ id: "test-partner-id", fullName: "María López" });
    setup();

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        {
          id: "test-partner-id",
          data: {
            number: mockPartnerData.number,
            personalId: mockPartnerData.personalId,
            fullName: mockPartnerData.fullName,
            address: mockPartnerData.address,
            email: mockPartnerData.email,
            phoneNumber: mockPartnerData.phoneNumber,
            role: mockPartnerData.role,
          },
        },
        {},
      );
      expect(mockNavigate).toHaveBeenCalledWith("/partners");
    });
  });

  it("dispatches error and does not navigate when API returns falsy response", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce(null);
    setup();

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(mockErrorDispatch).toHaveBeenCalledWith(
        "Ha habido un problema al editar el socio. Por favor, inténtalo más tarde",
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("dispatches error and does not navigate when API throws", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockRejectedValueOnce(new Error("Network error"));
    setup();

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(mockErrorDispatch).toHaveBeenCalledWith(
        "Ha habido un problema al editar el socio. Por favor, inténtalo más tarde",
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
