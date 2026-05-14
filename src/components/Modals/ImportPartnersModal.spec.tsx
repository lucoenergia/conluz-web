import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

const mockMutate = vi.fn();

vi.mock("../../api/users/users", () => ({
  useCreateUsersWithFile: () => ({ mutate: mockMutate }),
}));

import { ImportPartnersModal } from "./ImportPartnersModal";

describe("ImportPartnersModal", () => {
  const mockOnClose = vi.fn();
  const mockOnImportComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setup = (props = {}) => {
    render(
      <ImportPartnersModal
        isOpen={true}
        onClose={mockOnClose}
        onImportComplete={mockOnImportComplete}
        {...props}
      />,
    );
  };

  describe("Upload view", () => {
    it("renders the modal title", () => {
      setup();
      expect(screen.getByText("Importar Socios desde CSV")).toBeInTheDocument();
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
      setup();

      const file = new File(["a,b,c"], "test.csv", { type: "text/csv" });
      const input = screen.getByTestId("csv-file-input");
      await user.upload(input, file);

      await user.click(screen.getByRole("button", { name: /Importar/i }));

      expect(screen.getByText("Importando socios...")).toBeInTheDocument();
    });
  });

  describe("Results view", () => {
    it("shows success message with created count", async () => {
      const user = userEvent.setup();
      mockMutate.mockImplementation((_args, options) => {
        options?.onSuccess?.({ created: ["user1", "user2"], errors: [] });
      });
      setup();

      const file = new File(["a,b,c"], "test.csv", { type: "text/csv" });
      const input = screen.getByTestId("csv-file-input");
      await user.upload(input, file);
      await user.click(screen.getByRole("button", { name: /Importar/i }));

      await waitFor(() => {
        expect(
          screen.getByText("Importación completada"),
        ).toBeInTheDocument();
        expect(screen.getByText("Se han creado 2 socios")).toBeInTheDocument();
      });
    });

    it("shows singular message when one user created", async () => {
      const user = userEvent.setup();
      mockMutate.mockImplementation((_args, options) => {
        options?.onSuccess?.({ created: ["user1"], errors: [] });
      });
      setup();

      const file = new File(["a,b,c"], "test.csv", { type: "text/csv" });
      const input = screen.getByTestId("csv-file-input");
      await user.upload(input, file);
      await user.click(screen.getByRole("button", { name: /Importar/i }));

      await waitFor(() => {
        expect(screen.getByText("Se ha creado 1 socio")).toBeInTheDocument();
      });
    });

    it("shows errors when import has errors", async () => {
      const user = userEvent.setup();
      mockMutate.mockImplementation((_args, options) => {
        options?.onSuccess?.({
          created: ["user1"],
          errors: [
            {
              personalId: "12345678Z",
              errorMessage: "Email duplicado",
            },
          ],
        });
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

      mockMutate.mockImplementation((_args, options) => {
        options?.onError?.(new Error("Network error"));
      });

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
      mockMutate.mockImplementation((_args, options) => {
        options?.onSuccess?.({ created: ["user1"], errors: [] });
      });
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
      mockMutate.mockImplementation((_args, options) => {
        options?.onSuccess?.({ created: ["user1"], errors: [] });
      });
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
      mockMutate.mockImplementation((_args, options) => {
        options?.onSuccess?.({ created: ["user1"], errors: [] });
      });
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
});
