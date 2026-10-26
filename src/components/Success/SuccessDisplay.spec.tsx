import "@testing-library/jest-dom";
import type { FC } from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { useSuccessDispatch } from "../../context/success.context";
import { SuccessDisplay } from "./SuccessDisplay";

const Saver: FC = () => {
  const dispatch = useSuccessDispatch();
  return <button onClick={() => dispatch("Canal guardado.")}>Guardar</button>;
};

describe("SuccessDisplay", () => {
  it("#310 announces a confirmation through a region in place before it, and shows it as a note", async () => {
    renderWithProviders(
      <>
        <Saver />
        <SuccessDisplay />
      </>,
    );
    const region = screen.getByRole("status");
    expect(region).toHaveTextContent(/^$/);

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(region).toHaveTextContent("Canal guardado.");
    expect(await screen.findByRole("note")).toHaveTextContent("Canal guardado.");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
