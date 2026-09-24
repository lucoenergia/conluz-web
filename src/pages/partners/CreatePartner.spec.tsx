import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation } from "../../test/queryState";
import { useCreateUser } from "../../api/users/users";

// Mocks
const mockNavigate = vi.fn();
const mockErrorDispatch = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

vi.mock(import("../../api/users/users"), () => ({
  useCreateUser: vi.fn(),
}));

vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock("../../components/PartnerForm/PartnerForm", () => ({
  PartnerForm: ({ handleSubmit, submitLabel }: { handleSubmit: (v: Record<string, unknown>) => void; submitLabel: string }) => (
    <button
      onClick={() =>
        handleSubmit({
          fullName: "Juan García",
          personalId: "12345678Z",
          number: 42,
          email: "juan@example.com",
          address: "Calle Mayor 1",
          phoneNumber: "600123456",
          password: "secreto123",
        })
      }
    >
      {submitLabel}
    </button>
  ),
}));

// Imports after mocks
import { CreatePartnerPage } from "./CreatePartner";

describe("CreatePartnerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCreateUser).mockReturnValue(mutation.idle({ mutateAsync: mockMutateAsync }));
  });

  const setup = () => {
    renderWithProviders(<CreatePartnerPage />, { activeCommunityId: "community-1" });
  };

  it("renders page header with correct title", () => {
    setup();

    expect(screen.getByText("Crear nuevo socio")).toBeInTheDocument();
    expect(screen.getByText("Registra un nuevo socio en la comunidad energética")).toBeInTheDocument();
  });

  it("renders breadcrumb navigation", () => {
    setup();

    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.getByText("Socios")).toBeInTheDocument();
    expect(screen.getByText("Nuevo")).toBeInTheDocument();
  });

  it("renders PartnerForm submit button with correct label", () => {
    setup();

    expect(screen.getByRole("button", { name: "Crear socio" })).toBeInTheDocument();
  });

  it("calls createUser with mapped data and navigates to /partners on success", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce({ id: "new-id", fullName: "Juan García" });
    setup();

    await user.click(screen.getByRole("button", { name: "Crear socio" }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        data: {
          fullName: "Juan García",
          personalId: "12345678Z",
          number: 42,
          email: "juan@example.com",
          address: "Calle Mayor 1",
          phoneNumber: "600123456",
          password: "secreto123",
          communityId: "community-1",
          communityRole: "COMMUNITY_MEMBER",
        },
      });
      const submittedData = mockMutateAsync.mock.calls[0][0].data;
      expect(submittedData).not.toHaveProperty("role");
      expect(mockNavigate).toHaveBeenCalledWith("/partners");
    });
  });

  it("dispatches error and does not navigate when API returns falsy response", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce(null);
    setup();

    await user.click(screen.getByRole("button", { name: "Crear socio" }));

    await waitFor(() => {
      expect(mockErrorDispatch).toHaveBeenCalledWith(
        "Ha habido un problema al crear el socio. Por favor, inténtalo más tarde",
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("dispatches error and does not navigate when API throws", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockRejectedValueOnce(new Error("Network error"));
    setup();

    await user.click(screen.getByRole("button", { name: "Crear socio" }));

    await waitFor(() => {
      expect(mockErrorDispatch).toHaveBeenCalledWith(
        "Ha habido un problema al crear el socio. Por favor, inténtalo más tarde",
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
