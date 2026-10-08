import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { expectPasswordFieldContract } from "../../test/passwordField";
import { UserForm } from "./UserForm";

const mockHandleSubmit = vi.fn();

describe("UserForm", () => {
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
      const { container } = render(<UserForm {...defaultCreateProps} />);

      expect(screen.getByRole("textbox", { name: /nombre completo/i })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /dni\/nif/i })).toBeInTheDocument();
      expect(screen.getByRole("spinbutton", { name: /número de socio/i })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /dirección/i })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /número de teléfono/i })).toBeInTheDocument();
      expect(container.querySelectorAll('input[type="password"]')).toHaveLength(2);
    });

    it("renders submit button with the provided label", () => {
      render(<UserForm {...defaultCreateProps} />);

      expect(screen.getByRole("button", { name: "Crear socio" })).toBeInTheDocument();
    });

    it("submits correct data when all fields are filled", async () => {
      const user = userEvent.setup();
      const { container } = render(<UserForm {...defaultCreateProps} />);
      const [passwordInput, confirmInput] = container.querySelectorAll('input[type="password"]');

      await user.type(screen.getByRole("textbox", { name: /nombre completo/i }), "Juan García");
      await user.type(screen.getByRole("textbox", { name: /dni\/nif/i }), "12345678Z");
      await user.type(screen.getByRole("spinbutton", { name: /número de socio/i }), "42");
      await user.type(screen.getByRole("textbox", { name: /email/i }), "juan@example.com");
      await user.type(screen.getByRole("textbox", { name: /dirección/i }), "Calle Mayor 1");
      await user.type(screen.getByRole("textbox", { name: /número de teléfono/i }), "600123456");
      await user.type(passwordInput, "secreto de prueba largo");
      await user.type(confirmInput, "secreto de prueba largo");
      await user.click(screen.getByRole("button", { name: "Crear socio" }));

      expect(mockHandleSubmit).toHaveBeenCalledWith({
        fullName: "Juan García",
        personalId: "12345678Z",
        number: 42,
        email: "juan@example.com",
        address: "Calle Mayor 1",
        phoneNumber: "600123456",
        password: "secreto de prueba largo",
      });
      expect(mockHandleSubmit).not.toHaveBeenCalledWith(
        expect.objectContaining({ role: expect.anything() }),
      );
    }, 15000);

    it("does not render a role selector", () => {
      render(<UserForm {...defaultCreateProps} />);

      expect(screen.queryByRole("combobox", { name: /rol/i })).not.toBeInTheDocument();
      expect(screen.queryByText("Administrador")).not.toBeInTheDocument();
    });

    it("does not submit and marks confirm field invalid when passwords do not match", async () => {
      const user = userEvent.setup();
      const { container } = render(<UserForm {...defaultCreateProps} />);
      const [passwordInput, confirmInput] = container.querySelectorAll('input[type="password"]');

      await user.type(passwordInput, "frase de prueba uno");
      await user.type(confirmInput, "frase de prueba dos");
      await user.click(screen.getByRole("button", { name: "Crear socio" }));

      expect(mockHandleSubmit).not.toHaveBeenCalled();
      expect(confirmInput).toHaveAttribute("aria-invalid", "true");
    });

    it("clears error state when user edits the confirm field after mismatch", async () => {
      const user = userEvent.setup();
      const { container } = render(<UserForm {...defaultCreateProps} />);
      const [passwordInput, confirmInput] = container.querySelectorAll('input[type="password"]');

      await user.type(passwordInput, "frase de prueba uno");
      await user.type(confirmInput, "frase de prueba dos");
      await user.click(screen.getByRole("button", { name: "Crear socio" }));
      expect(confirmInput).toHaveAttribute("aria-invalid", "true");

      await user.type(confirmInput, "3");
      expect(confirmInput).not.toHaveAttribute("aria-invalid", "true");
    });

    it("clears error state when user edits the password field after mismatch", async () => {
      const user = userEvent.setup();
      const { container } = render(<UserForm {...defaultCreateProps} />);
      const [passwordInput, confirmInput] = container.querySelectorAll('input[type="password"]');

      await user.type(passwordInput, "frase de prueba uno");
      await user.type(confirmInput, "frase de prueba dos");
      await user.click(screen.getByRole("button", { name: "Crear socio" }));
      expect(confirmInput).toHaveAttribute("aria-invalid", "true");

      await user.type(passwordInput, "x");
      expect(confirmInput).not.toHaveAttribute("aria-invalid", "true");
    });

    describe("the password fields (#196)", () => {
      it("give both a toggle, autocomplete=new-password and no keyboard rewriting", async () => {
        const user = userEvent.setup();
        render(<UserForm {...defaultCreateProps} />);

        await expectPasswordFieldContract(user, screen.getByLabelText(/^Contraseña/), "new-password");
        await expectPasswordFieldContract(user, screen.getByLabelText(/^Confirmar contraseña/), "new-password");
      });

      it("show the policy with a passphrase example, tied to the password", () => {
        render(<UserForm {...defaultCreateProps} />);

        const hint = screen.getByText(/Usa entre 15 y 64 caracteres/);
        expect(hint).toHaveTextContent("«el gato duerme junto a la ventana»");
        expect(screen.getByLabelText(/^Contraseña/)).toHaveAttribute("aria-describedby", hint.id);
      });

      it.each([
        ["fewer than 15 characters", "corta", "La contraseña debe tener al menos 15 caracteres."],
        ["more than 64 characters", "a".repeat(65), "La contraseña no puede tener más de 64 caracteres."],
        // 19 emoji: 19 characters, 76 bytes.
        ["more than 72 bytes", "😀".repeat(19), "La contraseña es demasiado larga"],
      ])("refuse a password with %s, saying why, before anything is sent", async (_label, value, message) => {
        const user = userEvent.setup();
        render(<UserForm {...defaultCreateProps} />);

        await user.click(screen.getByLabelText(/^Contraseña/));
        await user.paste(value);
        await user.click(screen.getByLabelText(/^Confirmar contraseña/));
        await user.paste(value);
        await user.click(screen.getByRole("button", { name: "Crear socio" }));

        const field = screen.getByLabelText(/^Contraseña/);
        expect(field).toHaveAttribute("aria-invalid", "true");
        expect(field).toHaveAccessibleDescription(expect.stringContaining(message));
        expect(mockHandleSubmit).not.toHaveBeenCalled();
      });

      it("clear the policy error once the password is edited", async () => {
        const user = userEvent.setup();
        render(<UserForm {...defaultCreateProps} />);

        await user.type(screen.getByLabelText(/^Contraseña/), "corta");
        await user.click(screen.getByRole("button", { name: "Crear socio" }));
        expect(screen.getByText("La contraseña debe tener al menos 15 caracteres.")).toBeInTheDocument();

        await user.type(screen.getByLabelText(/^Contraseña/), "x");
        expect(screen.queryByText("La contraseña debe tener al menos 15 caracteres.")).not.toBeInTheDocument();
        expect(screen.getByLabelText(/^Contraseña/)).not.toHaveAttribute("aria-invalid", "true");
      });

      it("submit the password exactly as typed", async () => {
        const user = userEvent.setup();
        render(<UserForm {...defaultCreateProps} />);

        await user.type(screen.getByRole("textbox", { name: /nombre completo/i }), "Juan García");
        await user.type(screen.getByRole("textbox", { name: /dni\/nif/i }), "12345678Z");
        await user.type(screen.getByRole("spinbutton", { name: /número de socio/i }), "42");
        await user.type(screen.getByRole("textbox", { name: /email/i }), "juan@example.com");
        await user.click(screen.getByLabelText(/^Contraseña/));
        await user.paste("  frase con espacios larga  ");
        await user.click(screen.getByLabelText(/^Confirmar contraseña/));
        await user.paste("  frase con espacios larga  ");
        await user.click(screen.getByRole("button", { name: "Crear socio" }));

        expect(mockHandleSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ password: "  frase con espacios larga  " }),
        );
      });
    });

    it("shows spinner and disables button when isPending is true", () => {
      render(<UserForm {...defaultCreateProps} isPending={true} />);

      expect(screen.getByRole("progressbar")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Crear socio" })).toBeDisabled();
    });
  });

  describe("edit mode", () => {
    it("renders only shared fields and not create-only fields", () => {
      const { container } = render(<UserForm {...defaultEditProps} />);

      expect(screen.getByRole("textbox", { name: /nombre completo/i })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /dni\/nif/i })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /dirección/i })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /número de teléfono/i })).toBeInTheDocument();

      expect(screen.queryByRole("spinbutton", { name: /número de socio/i })).not.toBeInTheDocument();
      expect(container.querySelectorAll('input[type="password"]')).toHaveLength(0);
    });

    it("renders submit button with the provided label", () => {
      render(<UserForm {...defaultEditProps} />);

      expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
    });

    it("populates fields with provided initial values", () => {
      render(
        <UserForm
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
        <UserForm
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
      render(<UserForm {...defaultEditProps} isPending={true} />);

      expect(screen.getByRole("progressbar")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
    });
  });

  // #211 AC2. A screen reader must hear the same button while it saves: the
  // spinner must not replace its name, and its busy state must be exposed.
  describe.each([
    ["create", defaultCreateProps],
    ["edit", defaultEditProps],
  ])("the submit button in %s mode", (_mode, props) => {
    it("keeps the submit label as its name while pending, and says it is busy", () => {
      const label = props.submitLabel;
      const { rerender } = render(<UserForm {...props} isPending={false} />);

      const idle = screen.getByRole("button", { name: label });
      expect(idle).not.toHaveAttribute("aria-busy", "true");
      expect(idle).toBeEnabled();

      rerender(<UserForm {...props} isPending={true} />);

      const pending = screen.getByRole("button", { name: label });
      expect(pending).toBe(idle);
      expect(pending).toHaveAttribute("aria-busy", "true");
      expect(pending).toBeDisabled();
    });
  });
});
