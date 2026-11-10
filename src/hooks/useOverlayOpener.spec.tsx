import "@testing-library/jest-dom";
import { useState, type FC } from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../test/renderWithProviders";
import { useOverlayOpener } from "./useOverlayOpener";

/**
 * A page with two openers and a stand-in overlay: a plain region, so no focus
 * restoration of MUI's can return focus on the hook's behalf. Closing it moves
 * focus inside it first, as a real overlay holds focus while open.
 */
const Page: FC<{ explicitOpener?: boolean }> = ({ explicitOpener = false }) => {
  const [open, setOpen] = useState(false);
  const opener = useOverlayOpener(open);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <button type="button" onClick={() => setOpen(false)}>
        Otra cosa
      </button>
      <button
        type="button"
        onClick={() => {
          opener.record(explicitOpener ? anchor : undefined);
          setOpen(true);
        }}
      >
        Crear
      </button>
      <button type="button" ref={setAnchor}>
        Más acciones
      </button>
      {open && (
        <div role="region" aria-label="Formulario">
          <button type="button" autoFocus onClick={() => setOpen(false)}>
            Guardar
          </button>
        </div>
      )}
    </>
  );
};

/** The empty state hands over to the list's own create action when its write replaces it. */
const EmptyThenList: FC = () => {
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState(false);
  const opener = useOverlayOpener(open);
  return (
    <>
      {created ? (
        // In a list of its own, so React mounts a new button rather than
        // reusing the empty state's: the opener really is gone.
        <div>
          <button type="button" ref={opener.handOver}>
            Crear desde la lista
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            opener.record(undefined, { handOver: true });
            setOpen(true);
          }}
        >
          Crear desde el estado vacío
        </button>
      )}
      {open && (
        <div role="region" aria-label="Formulario">
          <button
            type="button"
            autoFocus
            onClick={() => {
              // The overlay closes and the list replaces the empty state, opener included.
              setOpen(false);
              setCreated(true);
            }}
          >
            Guardar
          </button>
        </div>
      )}
    </>
  );
};

describe("useOverlayOpener", () => {
  it("returns focus to the control that held it when the overlay opened, once the overlay has unmounted", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Page />);

    await user.click(screen.getByRole("button", { name: "Crear" }));
    expect(screen.getByRole("button", { name: "Guardar" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(screen.queryByRole("region", { name: "Formulario" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear" })).toHaveFocus();
  });

  it("returns focus to the opener it was given rather than the focused control, as a row's kebab", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Page explicitOpener />);

    await user.click(screen.getByRole("button", { name: "Crear" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(screen.getByRole("button", { name: "Más acciones" })).toHaveFocus();
  });

  it("returns focus once only: a later close of nothing moves no focus", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Page />);

    await user.click(screen.getByRole("button", { name: "Crear" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await user.click(screen.getByRole("button", { name: "Otra cosa" }));

    expect(screen.getByRole("button", { name: "Otra cosa" })).toHaveFocus();
  });

  it("hands focus over to the control that replaces an opener the overlay's write unmounted", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EmptyThenList />);

    await user.click(screen.getByRole("button", { name: "Crear desde el estado vacío" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(screen.getByRole("button", { name: "Crear desde la lista" })).toHaveFocus();
  });
});
