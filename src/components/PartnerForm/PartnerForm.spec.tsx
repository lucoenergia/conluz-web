import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { PartnerForm } from "./PartnerForm";

const mockHandleSubmit = vi.fn();

describe("PartnerForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultCreateProps = {
    mode: "create" as const,
    handleSubmit: mockHandleSubmit,
    isPending: false,
    submitLabel: "Crear socio",
  };

  const defaultEditProps = {
    mode: "edit" as const,
    handleSubmit: mockHandleSubmit,
    isPending: false,
    submitLabel: "Guardar cambios",
  };

  describe("create mode", () => {
    it("renders all fields including create-only fields", () => {
      const { container } = render(<PartnerForm {...defaultCreateProps} />);

      expect(screen.getByRole("textbox", { name: /nombre completo/i })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /dni\/nif/i })).toBeInTheDocument();
      expect(screen.getByRole("spinbutton", { name: /número de socio/i })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /dirección/i })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /número de teléfono/i })).toBeInTheDocument();
      expect(container.querySelectorAll('input[type="password"]')).toHaveLength(2);
    });

    it("renders submit button with the provided label", () => {
      render(<PartnerForm {...defaultCreateProps} />);

      expect(screen.getByRole("button", { name: "Crear socio" })).toBeInTheDocument();
    });

    it("submits correct data when all fields are filled", async () => {
      const user = userEvent.setup();
      const { container } = render(<PartnerForm {...defaultCreateProps} />);
      const [passwordInput, confirmInput] = container.querySelectorAll('input[type="password"]');

      await user.type(screen.getByRole("textbox", { name: /nombre completo/i }), "Juan García");
      await user.type(screen.getByRole("textbox", { name: /dni\/nif/i }), "12345678Z");
      await user.type(screen.getByRole("spinbutton", { name: /número de socio/i }), "42");
      await user.type(screen.getByRole("textbox", { name: /email/i }), "juan@example.com");
      await user.type(screen.getByRole("textbox", { name: /dirección/i }), "Calle Mayor 1");
      await user.type(screen.getByRole("textbox", { name: /número de teléfono/i }), "600123456");
      await user.type(passwordInput, "secreto123");
      await user.type(confirmInput, "secreto123");
      await user.click(screen.getByRole("button", { name: "Crear socio" }));

      expect(mockHandleSubmit).toHaveBeenCalledWith({
        fullName: "Juan García",
        personalId: "12345678Z",
        number: 42,
        email: "juan@example.com",
        address: "Calle Mayor 1",
        phoneNumber: "600123456",
        password: "secreto123",
        role: "PARTNER",
      });
    });

    it("does not submit and marks confirm field invalid when passwords do not match", async () => {
      const user = userEvent.setup();
      const { container } = render(<PartnerForm {...defaultCreateProps} />);
      const [passwordInput, confirmInput] = container.querySelectorAll('input[type="password"]');

      await user.type(passwordInput, "password1");
      await user.type(confirmInput, "password2");
      await user.click(screen.getByRole("button", { name: "Crear socio" }));

      expect(mockHandleSubmit).not.toHaveBeenCalled();
      expect(confirmInput).toHaveAttribute("aria-invalid", "true");
    });

    it("clears error state when user edits the confirm field after mismatch", async () => {
      const user = userEvent.setup();
      const { container } = render(<PartnerForm {...defaultCreateProps} />);
      const [passwordInput, confirmInput] = container.querySelectorAll('input[type="password"]');

      await user.type(passwordInput, "password1");
      await user.type(confirmInput, "password2");
      await user.click(screen.getByRole("button", { name: "Crear socio" }));
      expect(confirmInput).toHaveAttribute("aria-invalid", "true");

      await user.type(confirmInput, "3");
      expect(confirmInput).not.toHaveAttribute("aria-invalid", "true");
    });

    it("clears error state when user edits the password field after mismatch", async () => {
      const user = userEvent.setup();
      const { container } = render(<PartnerForm {...defaultCreateProps} />);
      const [passwordInput, confirmInput] = container.querySelectorAll('input[type="password"]');

      await user.type(passwordInput, "password1");
      await user.type(confirmInput, "password2");
      await user.click(screen.getByRole("button", { name: "Crear socio" }));
      expect(confirmInput).toHaveAttribute("aria-invalid", "true");

      await user.type(passwordInput, "x");
      expect(confirmInput).not.toHaveAttribute("aria-invalid", "true");
    });

    it("shows spinner and disables button when isPending is true", () => {
      render(<PartnerForm {...defaultCreateProps} isPending={true} />);

      expect(screen.queryByText("Crear socio")).not.toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  describe("edit mode", () => {
    it("renders only shared fields and not create-only fields", () => {
      const { container } = render(<PartnerForm {...defaultEditProps} />);

      expect(screen.getByRole("textbox", { name: /nombre completo/i })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /dni\/nif/i })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /dirección/i })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /número de teléfono/i })).toBeInTheDocument();

      expect(screen.queryByRole("spinbutton", { name: /número de socio/i })).not.toBeInTheDocument();
      expect(container.querySelectorAll('input[type="password"]')).toHaveLength(0);
    });

    it("renders submit button with the provided label", () => {
      render(<PartnerForm {...defaultEditProps} />);

      expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
    });

    it("populates fields with provided initial values", () => {
      render(
        <PartnerForm
          {...defaultEditProps}
          initialValues={{
            fullName: "María López",
            personalId: "87654321X",
            email: "maria@example.com",
            address: "Avenida Libertad 5",
            phoneNumber: "611987654",
          }}
        />,
      );

      expect(screen.getByDisplayValue("María López")).toBeInTheDocument();
      expect(screen.getByDisplayValue("87654321X")).toBeInTheDocument();
      expect(screen.getByDisplayValue("maria@example.com")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Avenida Libertad 5")).toBeInTheDocument();
      expect(screen.getByDisplayValue("611987654")).toBeInTheDocument();
    });

    it("submits correct data without create-only fields", async () => {
      const user = userEvent.setup();
      render(
        <PartnerForm
          {...defaultEditProps}
          initialValues={{
            fullName: "María López",
            personalId: "87654321X",
            email: "maria@example.com",
            address: "Avenida Libertad 5",
            phoneNumber: "611987654",
          }}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

      expect(mockHandleSubmit).toHaveBeenCalledWith({
        fullName: "María López",
        personalId: "87654321X",
        email: "maria@example.com",
        address: "Avenida Libertad 5",
        phoneNumber: "611987654",
      });
      expect(mockHandleSubmit).not.toHaveBeenCalledWith(
        expect.objectContaining({ password: expect.anything() }),
      );
    });

    it("shows spinner and disables button when isPending is true", () => {
      render(<PartnerForm {...defaultEditProps} isPending={true} />);

      expect(screen.queryByText("Guardar cambios")).not.toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });
});
