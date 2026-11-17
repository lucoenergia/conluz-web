import "@testing-library/jest-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { expectDeviceTimeZone } from "../../test/deviceTimeZone";
import { SharingAgreementFormDialog } from "./SharingAgreementFormDialog";

// Runs in the `app-time-zone` Vitest project: the device is in New York, five
// hours behind Madrid, so at 23:30 UTC its day is still the one before
// Madrid's.

const SENT_ON = "Fecha de envío del fichero a la distribuidora";

afterEach(() => {
  vi.useRealTimers();
});

function sections() {
  const group = screen.getByRole("group", { name: SENT_ON });
  return {
    day: within(group).getByRole("spinbutton", { name: "Dia" }),
    month: within(group).getByRole("spinbutton", { name: "Mes" }),
    year: within(group).getByRole("spinbutton", { name: "Año" }),
  };
}

function renderEdit(onSubmit = vi.fn(), distributorFileSentOn: string | null = null) {
  renderWithProviders(
    <SharingAgreementFormDialog
      isOpen
      mode="edit"
      initialValues={{ name: "Reparto 2025", nominalPowerKW: 45, distributorFileSentOn }}
      onCancel={vi.fn()}
      onSubmit={onSubmit}
    />,
  );
  return onSubmit;
}

describe("the distributor file sent date follows Madrid's calendar, wherever the device is", () => {
  it("runs as a device in New York", () => {
    expectDeviceTimeZone();
  });

  it("UI-AGR-020 opens on the stored day, not the day before", () => {
    renderEdit(vi.fn(), "2026-03-01");

    const { day, month, year } = sections();
    expect(day).toHaveTextContent("01");
    expect(month).toHaveTextContent("03");
    expect(year).toHaveTextContent("2026");
  });

  it("UI-AGR-020 accepts Madrid's today while the device's is still the day before", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-16T23:30:00Z"));
    const onSubmit = renderEdit();
    const user = userEvent.setup();

    await user.click(sections().day);
    await user.keyboard("17");
    await user.keyboard("11");
    await user.keyboard("2026");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ distributorFileSentOn: "2026-11-17" });
    expect(screen.queryByText("La fecha de envío no puede ser futura")).not.toBeInTheDocument();
  });

  it("UI-AGR-020 still refuses the day after Madrid's today", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-16T23:30:00Z"));
    const onSubmit = renderEdit();
    const user = userEvent.setup();

    await user.click(sections().day);
    await user.keyboard("18");
    await user.keyboard("11");
    await user.keyboard("2026");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("La fecha de envío no puede ser futura")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
