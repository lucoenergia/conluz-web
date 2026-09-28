import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import {
  SharingAgreementReferenceResponseStatus,
  SharingAgreementResponseStatus,
  type PartitionCoefficientResponse,
  type SharingAgreementPartitionCoefficientResponse,
  type SharingAgreementReferenceResponse,
} from "../../api/models";
import {
  getSharingAgreementById,
  useGetPlantActivePartitionCoefficients,
  type getPlantActivePartitionCoefficients,
} from "../../api/sharing-agreements/sharing-agreements";
import { query } from "../../test/queryState";
import { buildActiveCoefficient, buildCoefficient, buildSharingAgreement } from "../../test/fixtures";
import { renderWithTheme } from "./SharingAgreementCoefficientSet.testUtils";

vi.mock(import("../../context/success.context"), (orig) => import("./SharingAgreementCoefficientSet.mocks").then((m) => m.successContextModule(orig)));
vi.mock(import("../../api/supplies/supplies"), () => import("./SharingAgreementCoefficientSet.mocks").then((m) => m.suppliesModule()));
vi.mock(import("../../api/sharing-agreements/sharing-agreements"), (orig) => import("./SharingAgreementCoefficientSet.mocks").then((m) => m.sharingAgreementsModule(orig)));

/*
 * Two PUBLISHED agreements hold the coefficients in force, with installed
 * powers (80 kW and 60 kW) that differ from each other and from the draft's
 * 100 kW, so a power line computed with the wrong agreement shows.
 */
const REPARTO_2024: SharingAgreementReferenceResponse = {
  id: "agreement-2024",
  name: "Reparto 2024",
  status: SharingAgreementReferenceResponseStatus.PUBLISHED,
};
const REPARTO_AMPLIACION: SharingAgreementReferenceResponse = {
  id: "agreement-ampliacion",
  name: "Reparto ampliación",
  status: SharingAgreementReferenceResponseStatus.PUBLISHED,
};
const INSTALLED_POWER_KW: Record<string, number> = {
  [REPARTO_2024.id]: 80,
  [REPARTO_AMPLIACION.id]: 60,
};
const DRAFT_INSTALLED_POWER_KW = 100;

const VIVIENDA_A = { id: "s1", name: "Vivienda A", code: "ES0031300000000001AB" };
const VIVIENDA_B = { id: "s2", name: "Vivienda B", code: "ES0031300000000002CD" };
const LOCAL_C = { id: "s3", name: "Local C", code: "ES0031300000000003EF" };
/** The supply the picker offers (see testUtils' getAllSupplies). */
const TRASTERO = { id: "s10", name: "Trastero Nuevo", code: "ES999" };
const GARAJE_D = { id: "s4", name: "Garaje D", code: "ES0031300000000004GH" };
const NAVE_E = { id: "s5", name: "Nave E", code: "ES0031300000000005IJ" };

function draftRow(
  supply: { id: string; name: string; code: string },
  coefficient: number,
  inForce: { coefficient: number; agreement: SharingAgreementReferenceResponse } | null,
): SharingAgreementPartitionCoefficientResponse {
  return buildCoefficient({
    coefficientId: `coefficient-${supply.id}`,
    supply,
    coefficient,
    currentCoefficient: inForce
      ? { coefficient: inForce.coefficient, validFrom: "2024-01-01", sharingAgreement: inForce.agreement }
      : null,
  });
}

function activeCoefficient(
  supply: { id: string; name: string | null; code: string },
  coefficient: number,
  agreement: SharingAgreementReferenceResponse,
): PartitionCoefficientResponse {
  return buildActiveCoefficient({ id: `active-${supply.id}`, supply, coefficient, sharingAgreement: agreement, validFrom: "2024-01-01" });
}

/** Vivienda A lowered (AC1), Vivienda B raised from another agreement, Local C new. */
const DRAFT_ROWS = [
  draftRow(VIVIENDA_A, 0.031746, { coefficient: 0.041667, agreement: REPARTO_2024 }),
  draftRow(VIVIENDA_B, 0.5, { coefficient: 0.4, agreement: REPARTO_AMPLIACION }),
  draftRow(LOCAL_C, 0.468254, null),
];

const ACTIVE = [
  activeCoefficient(VIVIENDA_A, 0.041667, REPARTO_2024),
  activeCoefficient(VIVIENDA_B, 0.4, REPARTO_AMPLIACION),
];

function givenActive(active: PartitionCoefficientResponse[]) {
  vi.mocked(useGetPlantActivePartitionCoefficients).mockImplementation((_plantId, options) =>
    options?.query?.enabled ? query.success<typeof getPlantActivePartitionCoefficients>(active) : query.disabled(),
  );
}

function renderDraft(coefficients: SharingAgreementPartitionCoefficientResponse[] = DRAFT_ROWS) {
  return renderWithTheme({
    coefficients,
    agreementStatus: SharingAgreementResponseStatus.DRAFT,
    installedPowerKw: DRAFT_INSTALLED_POWER_KW,
  });
}

/**
 * The draft's desktop table. The card list is mounted alongside it (a CSS-only
 * breakpoint), outside any table. Structural pick: the draft table has no
 * accessible name, and it precedes the outgoing-supplies table, which does.
 */
function table() {
  return screen.getAllByRole("table")[0];
}

/** The table row that names `supplyName`. */
function tableRow(supplyName: string) {
  return within(table()).getByText(supplyName).closest("tr")!;
}

beforeEach(() => {
  // Call history is not cleared between tests by the config; the assertions
  // below read it.
  vi.mocked(useGetPlantActivePartitionCoefficients).mockClear();
  vi.mocked(getSharingAgreementById).mockClear();
  givenActive(ACTIVE);
  vi.mocked(getSharingAgreementById).mockImplementation((_plantId, sharingAgreementId) => {
    const installedPowerKw = INSTALLED_POWER_KW[sharingAgreementId];
    return installedPowerKw === undefined
      ? Promise.reject(new Error(`No agreement fixture for ${sharingAgreementId}`))
      : Promise.resolve(
          buildSharingAgreement({ id: sharingAgreementId, status: SharingAgreementResponseStatus.PUBLISHED, installedPowerKw }),
        );
  });
});

describe("SharingAgreementCoefficientSet (draft vs. in force)", () => {
  it("shows the draft as the main value, with what is in force and the change in points beneath (AC1, AC2, AC6)", async () => {
    renderDraft();

    const viviendaA = tableRow("Vivienda A");
    expect(within(viviendaA).getByText("3,1746 %")).toBeInTheDocument();
    expect(within(viviendaA).getByText("Vigente 4,1667 % · -0,9921 p.p.")).toBeInTheDocument();
    expect(within(viviendaA).getByText("3,17 kW")).toBeInTheDocument();
    // 0.041667 × Reparto 2024's 80 kW, not the draft's 100 kW.
    expect(await within(viviendaA).findByText("Vigente 3,33 kW")).toBeInTheDocument();

    const viviendaB = tableRow("Vivienda B");
    expect(within(viviendaB).getByText("Vigente 40,0000 % · +10,0000 p.p.")).toBeInTheDocument();
    // 0.4 × Reparto ampliación's 60 kW.
    expect(await within(viviendaB).findByText("Vigente 24,00 kW")).toBeInTheDocument();

    const localC = tableRow("Local C");
    expect(within(localC).getByText("Nuevo")).toBeInTheDocument();
    expect(within(localC).getByText("Sin coeficiente vigente")).toBeInTheDocument();
    expect(within(localC).queryByText(/^Vigente/)).not.toBeInTheDocument();

    expect(within(viviendaA).queryByText("Nuevo")).not.toBeInTheDocument();
    expect(within(viviendaB).queryByText("Nuevo")).not.toBeInTheDocument();
  });

  it("names one draft column and drops the in-force column", () => {
    renderDraft();
    expect(within(table()).getByRole("columnheader", { name: "Coeficiente" })).toBeInTheDocument();
    expect(screen.queryByText("Coeficiente actual")).not.toBeInTheDocument();
  });

  it("does not name an agreement when the in-force coefficients come from several (AC4)", () => {
    renderDraft();
    expect(screen.getByText("Comparado con los coeficientes en vigor hoy")).toBeInTheDocument();
    expect(screen.queryByText(/Comparado con el acuerdo vigente/)).not.toBeInTheDocument();
  });

  it("names the agreement, without a date, when every in-force coefficient comes from it (AC3)", () => {
    const rows = [
      draftRow(VIVIENDA_A, 0.5, { coefficient: 0.041667, agreement: REPARTO_2024 }),
      draftRow(VIVIENDA_B, 0.25, { coefficient: 0.3, agreement: REPARTO_2024 }),
      draftRow(LOCAL_C, 0.25, null),
    ];
    givenActive([activeCoefficient(VIVIENDA_A, 0.041667, REPARTO_2024), activeCoefficient(VIVIENDA_B, 0.3, REPARTO_2024)]);
    renderDraft(rows);

    expect(screen.getByText("Comparado con el acuerdo vigente «Reparto 2024»")).toBeInTheDocument();
  });

  it("shows no comparison at all for a plant's first agreement (AC5)", () => {
    givenActive([]);
    renderDraft([draftRow(VIVIENDA_A, 0.6, null), draftRow(VIVIENDA_B, 0.4, null)]);

    expect(screen.queryByText(/^Comparado con/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Vigente|^Sin coeficiente vigente$/)).not.toBeInTheDocument();
    expect(screen.queryByText("Nuevo")).not.toBeInTheDocument();
  });

  it("neither compares nor asks for the plant's active coefficients on a PUBLISHED agreement (AC10)", () => {
    renderWithTheme({ coefficients: DRAFT_ROWS, agreementStatus: SharingAgreementResponseStatus.PUBLISHED, installedPowerKw: 100 });

    expect(vi.mocked(useGetPlantActivePartitionCoefficients)).toHaveBeenCalled();
    for (const [, options] of vi.mocked(useGetPlantActivePartitionCoefficients).mock.calls) {
      expect(options?.query?.enabled).toBe(false);
    }
    expect(getSharingAgreementById).not.toHaveBeenCalled();
    expect(screen.queryByText(/^Comparado con|^Vigente|^Sin coeficiente vigente$/)).not.toBeInTheDocument();
    expect(screen.queryByText("Nuevo")).not.toBeInTheDocument();
  });

  it("drops the context line, but keeps each row's own comparison, when the active coefficients fail", async () => {
    vi.mocked(useGetPlantActivePartitionCoefficients).mockImplementation((_plantId, options) =>
      options?.query?.enabled ? query.error(new Error("boom")) : query.disabled(),
    );
    renderDraft();

    expect(screen.queryByText(/^Comparado con/)).not.toBeInTheDocument();
    expect(within(tableRow("Vivienda A")).getByText("Vigente 4,1667 % · -0,9921 p.p.")).toBeInTheDocument();
    expect(await within(tableRow("Vivienda A")).findByText("Vigente 3,33 kW")).toBeInTheDocument();
    expect(within(tableRow("Local C")).getByText("Nuevo")).toBeInTheDocument();
  });

  it("holds the context line with a skeleton while the active coefficients load", () => {
    vi.mocked(useGetPlantActivePartitionCoefficients).mockImplementation((_plantId, options) =>
      options?.query?.enabled ? query.loading() : query.disabled(),
    );
    renderDraft();

    expect(screen.getByLabelText("Cargando comparación")).toBeInTheDocument();
    // The table itself never waits.
    expect(within(tableRow("Vivienda A")).getByText("3,1746 %")).toBeInTheDocument();
  });

  it("shows a dash for the in-force power whose agreement cannot be read, and leaves the coefficients alone", async () => {
    vi.mocked(getSharingAgreementById).mockImplementation((_plantId, sharingAgreementId) =>
      sharingAgreementId === REPARTO_AMPLIACION.id
        ? Promise.reject(new Error("boom"))
        : Promise.resolve(buildSharingAgreement({ id: sharingAgreementId, status: SharingAgreementResponseStatus.PUBLISHED, installedPowerKw: 80 })),
    );
    renderDraft();

    const viviendaB = tableRow("Vivienda B");
    expect(await within(viviendaB).findByText("Vigente —")).toBeInTheDocument();
    expect(within(viviendaB).getByText("Vigente 40,0000 % · +10,0000 p.p.")).toBeInTheDocument();
    expect(await within(tableRow("Vivienda A")).findByText("Vigente 3,33 kW")).toBeInTheDocument();
  });

  it("reads each authoring agreement once, however many rows it covers", async () => {
    const rows = [
      draftRow(VIVIENDA_A, 0.5, { coefficient: 0.041667, agreement: REPARTO_2024 }),
      draftRow(VIVIENDA_B, 0.25, { coefficient: 0.3, agreement: REPARTO_2024 }),
      draftRow(LOCAL_C, 0.25, { coefficient: 0.2, agreement: REPARTO_AMPLIACION }),
    ];
    renderDraft(rows);

    await within(tableRow("Local C")).findByText("Vigente 12,00 kW");
    const requestedIds = vi.mocked(getSharingAgreementById).mock.calls.map(([, id]) => id);
    expect([...requestedIds].sort()).toEqual([REPARTO_AMPLIACION.id, REPARTO_2024.id].sort());
  });

  it("renders the same content in the mobile cards (AC11)", async () => {
    renderDraft();

    for (const text of ["Vigente 4,1667 % · -0,9921 p.p.", "Vigente 40,0000 % · +10,0000 p.p.", "Sin coeficiente vigente", "Nuevo"]) {
      const matches = screen.getAllByText(text);
      expect(matches).toHaveLength(2);
      expect(matches.filter((element) => table().contains(element))).toHaveLength(1);
    }
    await waitFor(() => expect(screen.getAllByText("Vigente 3,33 kW")).toHaveLength(2));
    expect(screen.getAllByText("Vigente 24,00 kW")).toHaveLength(2);
  });

  describe("outgoing supplies", () => {
    /** Garaje D and Nave E are in force but not in the draft, from different agreements, in CUPS order. */
    const WITH_OUTGOING = [
      ...ACTIVE,
      activeCoefficient(GARAJE_D, 0.125, REPARTO_2024),
      activeCoefficient(NAVE_E, 0.05, REPARTO_AMPLIACION),
    ];

    function outgoingTable() {
      return screen.getByRole("table", { name: /^Salen del reparto/ });
    }

    it("lists them below the draft, expanded, in the endpoint's CUPS order (AC9)", async () => {
      givenActive(WITH_OUTGOING);
      renderDraft();

      expect(screen.getByRole("button", { name: /Salen del reparto \(2\)/ })).toHaveAttribute("aria-expanded", "true");
      const [, garaje, nave] = within(outgoingTable()).getAllByRole("row");
      expect(within(garaje).getByText("Garaje D")).toBeInTheDocument();
      expect(within(garaje).getByText("Vigente 12,5000 %")).toBeInTheDocument();
      expect(await within(garaje).findByText("Vigente 10,00 kW")).toBeInTheDocument();
      expect(within(nave).getByText("Nave E")).toBeInTheDocument();
      expect(within(nave).getByText("Vigente 5,0000 %")).toBeInTheDocument();
      expect(await within(nave).findByText("Vigente 3,00 kW")).toBeInTheDocument();
      // The narrow-viewport list carries the same entries.
      expect(within(screen.getByRole("list", { name: /^Salen del reparto/ })).getAllByRole("listitem")).toHaveLength(2);
    });

    it("counts an agreement that only an outgoing supply comes from", () => {
      const rows = [
        draftRow(VIVIENDA_A, 0.6, { coefficient: 0.041667, agreement: REPARTO_2024 }),
        draftRow(VIVIENDA_B, 0.4, { coefficient: 0.3, agreement: REPARTO_2024 }),
      ];
      givenActive([
        activeCoefficient(VIVIENDA_A, 0.041667, REPARTO_2024),
        activeCoefficient(VIVIENDA_B, 0.3, REPARTO_2024),
        activeCoefficient(NAVE_E, 0.05, REPARTO_AMPLIACION),
      ]);
      renderDraft(rows);

      expect(screen.getByText("Comparado con los coeficientes en vigor hoy")).toBeInTheDocument();
    });

    it("is not rendered when nothing leaves", () => {
      renderDraft();
      expect(screen.queryByText(/^Salen del reparto/)).not.toBeInTheDocument();
    });

    it("is not narrowed by the search box", async () => {
      givenActive(WITH_OUTGOING);
      renderDraft();
      fireEvent.change(screen.getByPlaceholderText("Buscar por punto o CUPS"), { target: { value: "Vivienda A" } });
      await waitFor(() => expect(within(table()).queryByText("Vivienda B")).not.toBeInTheDocument());

      expect(within(outgoingTable()).getByText("Garaje D")).toBeInTheDocument();
      expect(within(outgoingTable()).getByText("Nave E")).toBeInTheDocument();
    });

    it("reports a failed read inline, with a retry, and draws the rest as usual", async () => {
      const failed = query.error(new Error("boom"));
      vi.mocked(useGetPlantActivePartitionCoefficients).mockImplementation((_plantId, options) =>
        options?.query?.enabled ? failed : query.disabled(),
      );
      const user = userEvent.setup({ delay: null });
      renderDraft();

      expect(screen.getByRole("alert")).toHaveTextContent("No se han podido cargar los puntos que salen del reparto.");
      expect(screen.queryByText(/^Comparado con/)).not.toBeInTheDocument();
      expect(within(tableRow("Vivienda A")).getByText("Vigente 4,1667 % · -0,9921 p.p.")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Reintentar" }));
      expect(failed.refetch).toHaveBeenCalledTimes(1);
    });

    it("is not shown on a PUBLISHED agreement (AC10)", () => {
      givenActive(WITH_OUTGOING);
      renderWithTheme({ coefficients: DRAFT_ROWS, agreementStatus: SharingAgreementResponseStatus.PUBLISHED, installedPowerKw: 100 });
      expect(screen.queryByText(/^Salen del reparto/)).not.toBeInTheDocument();
    });
  });

  describe("while editing", () => {
    it("retracks the difference against the value being typed", async () => {
      const user = userEvent.setup({ delay: null });
      renderDraft();
      await user.click(screen.getByRole("button", { name: "Editar a mano" }));
      // The editor opens in kW: 10 kW of the draft's 100 kW is 10 %.
      // The field has no accessible name of its own (the aria-label lands on the
      // TextField root), so it is found within its row, as the other specs do.
      const input = within(tableRow("Vivienda A")).getByRole("textbox");
      await user.clear(input);
      await user.type(input, "10");

      expect(within(tableRow("Vivienda A")).getByText("Vigente 4,1667 % · +5,8333 p.p.")).toBeInTheDocument();
    });

    it("keeps the in-force value without a difference while the field is empty", async () => {
      const user = userEvent.setup({ delay: null });
      renderDraft();
      await user.click(screen.getByRole("button", { name: "Editar a mano" }));
      // The field has no accessible name of its own (the aria-label lands on the
      // TextField root), so it is found within its row, as the other specs do.
      const input = within(tableRow("Vivienda A")).getByRole("textbox");
      await user.clear(input);

      expect(within(tableRow("Vivienda A")).getByText("Vigente 4,1667 %")).toBeInTheDocument();
    });

    it("shows the in-force value of a supply re-added during the session, instead of calling it new", async () => {
      givenActive([...ACTIVE, activeCoefficient(TRASTERO, 0.2, REPARTO_AMPLIACION)]);
      const user = userEvent.setup({ delay: null });
      renderDraft();
      await user.click(screen.getByRole("button", { name: "Editar a mano" }));
      await user.click(screen.getByRole("button", { name: "Añadir suministro" }));
      // The picker has no role="dialog" yet; modal-panel is its interim test id (see BasicModal).
      await user.click(await within(await screen.findByTestId("modal-panel")).findByText("Trastero Nuevo"));
      await user.click(screen.getByRole("button", { name: /Añadir \(1\)/ }));

      await waitFor(() => expect(within(table()).getByText("Trastero Nuevo")).toBeInTheDocument());
      const trastero = tableRow("Trastero Nuevo");
      // The field starts empty, so there is no difference yet.
      expect(within(trastero).getByText("Vigente 20,0000 %")).toBeInTheDocument();
      expect(within(trastero).queryByText("Nuevo")).not.toBeInTheDocument();
    });

    it("moves a supply removed during the session into the outgoing section", async () => {
      const user = userEvent.setup({ delay: null });
      renderDraft();
      expect(screen.queryByText(/^Salen del reparto/)).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Editar a mano" }));
      await user.click(within(tableRow("Vivienda B")).getByRole("button", { name: "Quitar Vivienda B" }));

      const outgoing = screen.getByRole("table", { name: "Salen del reparto (1)" });
      expect(within(outgoing).getByText("Vivienda B")).toBeInTheDocument();
      expect(within(outgoing).getByText("Vigente 40,0000 %")).toBeInTheDocument();
    });

    it("takes an outgoing supply out of the section when it is re-added", async () => {
      givenActive([...ACTIVE, activeCoefficient(TRASTERO, 0.2, REPARTO_AMPLIACION)]);
      const user = userEvent.setup({ delay: null });
      renderDraft();
      expect(within(screen.getByRole("table", { name: "Salen del reparto (1)" })).getByText("Trastero Nuevo")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Editar a mano" }));
      await user.click(screen.getByRole("button", { name: "Añadir suministro" }));
      await user.click(await within(await screen.findByTestId("modal-panel")).findByText("Trastero Nuevo"));
      await user.click(screen.getByRole("button", { name: /Añadir \(1\)/ }));

      await waitFor(() => expect(screen.queryByText(/^Salen del reparto/)).not.toBeInTheDocument());
    });

    it("calls a supply added during the session new when nothing is in force for it", async () => {
      const user = userEvent.setup({ delay: null });
      renderDraft();
      await user.click(screen.getByRole("button", { name: "Editar a mano" }));
      await user.click(screen.getByRole("button", { name: "Añadir suministro" }));
      await user.click(await within(await screen.findByTestId("modal-panel")).findByText("Trastero Nuevo"));
      await user.click(screen.getByRole("button", { name: /Añadir \(1\)/ }));

      await waitFor(() => expect(within(table()).getByText("Trastero Nuevo")).toBeInTheDocument());
      const trastero = tableRow("Trastero Nuevo");
      expect(within(trastero).getByText("Nuevo")).toBeInTheDocument();
      expect(within(trastero).getByText("Sin coeficiente vigente")).toBeInTheDocument();
    });
  });
});
