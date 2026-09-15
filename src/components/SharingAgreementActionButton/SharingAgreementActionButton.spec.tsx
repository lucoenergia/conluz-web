import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../../theme";
import { SharingAgreementActionButton } from "./SharingAgreementActionButton";

function renderButton(disabledReason?: string, onClick = vi.fn()) {
  render(
    <ThemeProvider theme={theme}>
      <SharingAgreementActionButton
        action={{ label: "Poner en vigor", onClick, disabledReason }}
        emphasis="primary"
      />
    </ThemeProvider>,
  );
  return { onClick, button: screen.getByRole("button", { name: "Poner en vigor" }) };
}

describe("SharingAgreementActionButton", () => {
  it("runs its handler when it is not gated", async () => {
    const { onClick, button } = renderButton();
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("carries no reason and no description when it is not gated", () => {
    const { button } = renderButton();
    expect(button).not.toHaveAttribute("aria-disabled");
    expect(button).not.toHaveAttribute("aria-describedby");
  });

  it("stays focusable when gated — aria-disabled, never the disabled attribute", async () => {
    // A `disabled` button drops out of the tab order and takes its own
    // explanation with it, which is the opposite of what a blocked regulatory
    // action needs.
    const { button } = renderButton("Faltan 25,0000 % para llegar al 100,0000 %.");
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    await userEvent.tab();
    expect(button).toHaveFocus();
  });

  it("exposes the blocking reason as visible text bound via aria-describedby, never a tooltip", () => {
    const reason = "Faltan 25,0000 % para llegar al 100,0000 %.";
    const { button } = renderButton(reason);
    const describedBy = button.getAttribute("aria-describedby") as string;
    expect(describedBy).toBeTruthy();
    const description = document.getElementById(describedBy);
    expect(description).toBeVisible();
    expect(description).toHaveTextContent(reason);
    expect(button).not.toHaveAttribute("title");
  });

  it("does not run its handler when gated", async () => {
    const { onClick, button } = renderButton("La planta no tiene CAU configurado.");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("reserves the reason's line whether or not a reason is showing, so gaining one never moves the button", () => {
    const { unmount } = render(
      <ThemeProvider theme={theme}>
        <SharingAgreementActionButton action={{ label: "Generar", onClick: vi.fn() }} emphasis="secondary" />
      </ThemeProvider>,
    );
    const enabledCaption = document.querySelector(".MuiTypography-caption");
    expect(enabledCaption).toBeInTheDocument();
    expect(enabledCaption).toHaveTextContent("");
    unmount();
  });
});
