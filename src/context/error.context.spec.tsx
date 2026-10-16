import "@testing-library/jest-dom";
import { useEffect } from "react";
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { renderWithProviders } from "../test/renderWithProviders";
import { useError, useErrorDispatch } from "./error.context";

const MESSAGE = "No se pudo cargar la información.";

/**
 * A consumer that reports a failed read the way the screens do: an effect on
 * the read's error and the dispatch. It stops dispatching after a few rounds, so
 * a provider whose dispatch keeps changing fails this spec instead of hanging it.
 */
const MAX_DISPATCHES = 5;
let dispatches = 0;

function FailingScreen() {
  const errorDispatch = useErrorDispatch();
  const errors = useError();
  const { error } = useQuery({
    queryKey: ["error-context-spec"],
    queryFn: () => Promise.reject(new Error("Request failed with status code 500")),
  });

  useEffect(() => {
    if (error && dispatches < MAX_DISPATCHES) {
      dispatches += 1;
      errorDispatch(MESSAGE);
    }
  }, [error, errorDispatch]);

  return (
    <ul aria-label="Errores">
      {errors?.map((message, index) => <li key={index}>{message}</li>)}
    </ul>
  );
}

describe("ErrorProvider", () => {
  it("a failed read reported from an effect on the dispatch is reported once, and does not loop", async () => {
    dispatches = 0;
    renderWithProviders(<FailingScreen />);

    expect(await screen.findByText(MESSAGE)).toBeInTheDocument();
    // Long enough for a dispatch that changes on every render to have gone round again.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(dispatches).toBe(1);
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(1));
  });
});
