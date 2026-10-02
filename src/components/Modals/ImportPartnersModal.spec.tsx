import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { buildCommunity, buildCurrentUser } from "../../test/fixtures";

// CsvImportModal names the community the rows are imported into (#186), which
// it resolves from the caller's memberships and the community list.
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllCommunities: vi.fn(),
}));

vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => buildCurrentUser({ id: "admin", memberships: { "community-a": "COMMUNITY_ADMIN" } }),
}));

import { useGetAllCommunities, type getAllCommunities } from "../../api/communities/communities";

import { ImportPartnersModal } from "./ImportPartnersModal";

// No API module is mocked: the modal no longer reaches one. It performs the
// import through the action it is handed, which is the whole point of taking it
// as a required prop -- a caller who was not given the action cannot mount this
// component at all, so there is no "denied" case for the modal itself to have.
const mockRun = vi.fn();

describe("ImportPartnersModal", () => {
  const mockOnClose = vi.fn();
  const mockOnImportComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockRun.mockResolvedValue({ created: [], errors: [] });
    vi.mocked(useGetAllCommunities).mockReturnValue(
      query.success<typeof getAllCommunities>([buildCommunity({ id: "community-a", name: "Comunidad Solar Norte" })]),
    );
  });

  const setup = (props = {}, activeCommunityId: string | null = "community-a") => {
    renderWithProviders(
      <ImportPartnersModal
        isOpen={true}
        onClose={mockOnClose}
        onImportComplete={mockOnImportComplete}
        importUsers={{ run: mockRun, isPending: false }}
        {...props}
      />,
      { activeCommunityId },
    );
  };

  describe("Upload view", () => {
    it("AC9: names the target community in its header and in its title", () => {
      setup();
      expect(screen.getByRole("heading", { name: "Importar miembros a Comunidad Solar Norte" })).toBeInTheDocument();
      expect(screen.getByText("Comunidad · Comunidad Solar Norte")).toBeInTheDocument();
    });

    it("renders the CSV drop zone", () => {
      setup();
      expect(
        screen.getByText("Haz clic para seleccionar un archivo CSV"),
      ).toBeInTheDocument();
    });

    it("renders the CSV format hint", () => {
      setup();
      expect(
        screen.getByText("Formato esperado del CSV:"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /number, fullName, personalId, address, email, phoneNumber, role, password/,
        ),
      ).toBeInTheDocument();
    });

    it("renders Cancelar and Importar buttons", () => {
      setup();
      expect(
        screen.getByRole("button", { name: /Cancelar/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Importar/i }),
      ).toBeInTheDocument();
    });

    it("disables Importar button when no file is selected", () => {
      setup();
      expect(screen.getByRole("button", { name: /Importar/i })).toBeDisabled();
    });

    it("calls onClose when Cancelar is clicked", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByRole("button", { name: /Cancelar/i }));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("enables Importar button after file selection", async () => {
      const user = userEvent.setup();
      setup();

      const file = new File(["a,b,c"], "test.csv", { type: "text/csv" });
      const input = screen.getByTestId("csv-file-input");
      await user.upload(input, file);

      expect(
        screen.getByRole("button", { name: /Importar/i }),
      ).not.toBeDisabled();
    });

    it("shows file name after selection", async () => {
      const user = userEvent.setup();
      setup();

      const file = new File(["a,b,c"], "test.csv", { type: "text/csv" });
      const input = screen.getByTestId("csv-file-input");
      await user.upload(input, file);

      expect(screen.getByText("test.csv")).toBeInTheDocument();
    });
  });

  describe("Uploading state", () => {
    it("shows loading spinner when uploading", async () => {
      const user = userEvent.setup();
      // In flight, so it must never settle. The default stub resolves at once,
      // which would carry the modal straight through to its results view.
      mockRun.mockReturnValue(new Promise(() => {}));
      setup();

      const file = new File(["a,b,c"], "test.csv", { type: "text/csv" });
      const input = screen.getByTestId("csv-file-input");
      await user.upload(input, file);

      await user.click(screen.getByRole("button", { name: /Importar/i }));

      expect(screen.getByText("Importando miembros...")).toBeInTheDocument();
    });
  });

  describe("Results view", () => {
    it("shows success message with created count", async () => {
      const user = userEvent.setup();
      mockRun.mockResolvedValue({ created: ["user1", "user2"], errors: [] });
      setup();

      const file = new File(["a,b,c"], "test.csv", { type: "text/csv" });
      const input = screen.getByTestId("csv-file-input");
      await user.upload(input, file);
      await user.click(screen.getByRole("button", { name: /Importar/i }));

      await waitFor(() => {
        expect(
          screen.getByText("Importación completada"),
        ).toBeInTheDocument();
        expect(screen.getByText("Se han creado 2 miembros")).toBeInTheDocument();
      });
    });

    it("shows singular message when one user created", async () => {
      const user = userEvent.setup();
      mockRun.mockResolvedValue({ created: ["user1"], errors: [] });
      setup();

      const file = new File(["a,b,c"], "test.csv", { type: "text/csv" });
      const input = screen.getByTestId("csv-file-input");
      await user.upload(input, file);
      await user.click(screen.getByRole("button", { name: /Importar/i }));

      await waitFor(() => {
        expect(screen.getByText("Se ha creado 1 miembro")).toBeInTheDocument();
      });
    });

    it("shows errors when import has errors", async () => {
      const user = userEvent.setup();
      mockRun.mockResolvedValue({
        created: ["user1"],
        errors: [{ personalId: "12345678Z", errorMessage: "Email duplicado" }],
      });
      setup();

      const file = new File(["a,b,c"], "test.csv", { type: "text/csv" });
      const input = screen.getByTestId("csv-file-input");
      await user.upload(input, file);
      await user.click(screen.getByRole("button", { name: /Importar/i }));

      await waitFor(() => {
        expect(screen.getByText("Errores (1):")).toBeInTheDocument();
        expect(screen.getByText(/12345678Z/)).toBeInTheDocument();
        expect(screen.getByText(/Email duplicado/)).toBeInTheDocument();
      });
    });

    it("shows error alert when API call fails", async () => {
      const user = userEvent.setup();
      setup();

      const file = new File(["a,b,c"], "test.csv", { type: "text/csv" });
      const input = screen.getByTestId("csv-file-input");
      await user.upload(input, file);

      // The action swallows the throw and reports failure as no value.
      mockRun.mockResolvedValue(undefined);

      await user.click(screen.getByRole("button", { name: /Importar/i }));

      await waitFor(() => {
        expect(
          screen.getByText(
            "Error al importar el archivo. Verifica el formato CSV e inténtalo de nuevo.",
          ),
        ).toBeInTheDocument();
      });
    });

    it("calls onImportComplete after successful import", async () => {
      const user = userEvent.setup();
      mockRun.mockResolvedValue({ created: ["user1"], errors: [] });
      setup();

      const file = new File(["a,b,c"], "test.csv", { type: "text/csv" });
      const input = screen.getByTestId("csv-file-input");
      await user.upload(input, file);
      await user.click(screen.getByRole("button", { name: /Importar/i }));

      await waitFor(() => {
        expect(mockOnImportComplete).toHaveBeenCalledTimes(1);
      });
    });

    it("navigates back to upload view when clicking Importar otro archivo", async () => {
      const user = userEvent.setup();
      mockRun.mockResolvedValue({ created: ["user1"], errors: [] });
      setup();

      const file = new File(["a,b,c"], "test.csv", { type: "text/csv" });
      const input = screen.getByTestId("csv-file-input");
      await user.upload(input, file);
      await user.click(screen.getByRole("button", { name: /Importar/i }));

      await waitFor(() => {
        expect(
          screen.getByText("Importación completada"),
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /Importar otro archivo/i }),
      );

      expect(
        screen.getByText("Haz clic para seleccionar un archivo CSV"),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Importar/i }),
      ).toBeDisabled();
    });

    it("calls onClose when Cerrar is clicked in results view", async () => {
      const user = userEvent.setup();
      mockRun.mockResolvedValue({ created: ["user1"], errors: [] });
      setup();

      const file = new File(["a,b,c"], "test.csv", { type: "text/csv" });
      const input = screen.getByTestId("csv-file-input");
      await user.upload(input, file);
      await user.click(screen.getByRole("button", { name: /Importar/i }));

      await waitFor(() => {
        expect(
          screen.getByText("Importación completada"),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /Cerrar/i }));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // The community is no longer this component's to choose: the action was built
  // from a community and carries it. What is left here is that the modal hands
  // over the file and nothing else, and that it still refuses to run before a
  // community has been selected at all.
  describe("Community scoping", () => {
    const selectAFile = async () => {
      const file = new File(["email,name"], "members.csv", { type: "text/csv" });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(input, file);
    };

    it("hands the action the file and nothing else -- it already knows where to write", async () => {
      setup({}, "community-b");
      await selectAFile();

      await userEvent.click(screen.getByRole("button", { name: /^Importar$/i }));

      await waitFor(() => expect(mockRun).toHaveBeenCalledTimes(1));
      expect(mockRun).toHaveBeenCalledWith({ file: expect.any(File) });
    });

    it("refuses to import when no community is selected", async () => {
      setup({}, null);
      await selectAFile();

      expect(screen.getByRole("button", { name: /^Importar$/i })).toBeDisabled();
      expect(mockRun).not.toHaveBeenCalled();
    });
  });
});
