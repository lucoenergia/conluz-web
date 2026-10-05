import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { LoadErrorAlert } from "./LoadErrorAlert";

describe("LoadErrorAlert", () => {
  it("states what failed as an alert", () => {
    render(<LoadErrorAlert message="No se pudo cargar." onRetry={() => {}} />);

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar.");
  });

  it("runs the retry when asked", async () => {
    const onRetry = vi.fn();
    render(<LoadErrorAlert message="No se pudo cargar." onRetry={onRetry} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));

    expect(onRetry).toHaveBeenCalledOnce();
  });
});
