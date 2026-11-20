import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import {
  LeavingClosureChangeResponseSource,
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementReferenceResponseStatus,
  type CoefficientDatesEffectsResponse,
  type SharingAgreementPartitionCoefficientResponse,
} from "../../api/models";
import { apiError } from "../../test/apiError";
import {
  OPEN_UNCLOSED,
  mockActivateMutateAsync,
  mockPreviewDatesMutateAsync,
  openBatchAction,
  renderWithTheme,
  selectPendingRow,
  typeDate,
} from "./SharingAgreementCoefficientSet.testUtils";

const { PENDING } = SharingAgreementPartitionCoefficientResponseApplicationState;

vi.mock(import("../../context/success.context"), (orig) => import("./SharingAgreementCoefficientSet.mocks").then((m) => m.successContextModule(orig)));
vi.mock(import("../../api/supplies/supplies"), () => import("./SharingAgreementCoefficientSet.mocks").then((m) => m.suppliesModule()));
vi.mock(import("../../api/sharing-agreements/sharing-agreements"), (orig) => import("./SharingAgreementCoefficientSet.mocks").then((m) => m.sharingAgreementsModule(orig)));

const PREVIOUS = { id: "initial", name: "Reparto inicial 2023", status: SharingAgreementReferenceResponseStatus.PUBLISHED };
const BAR = { id: "s-bar", name: "Bar La Plaza", code: "ES0031300000000009BR" };
const KIOSCO = { id: "s-kiosco", name: "Kiosco", code: "ES0031300000000010KS" };

const pending: SharingAgreementPartitionCoefficientResponse[] = [
  { coefficientId: "c1", supply: { id: "s1", name: "Vivienda A", code: "ES0031300000000001AB" }, coefficient: 0.5, applicationState: PENDING, ...OPEN_UNCLOSED },
  { coefficientId: "c2", supply: { id: "s2", name: "Vivienda B", code: "ES0031300000000002CD" }, coefficient: 0.5, applicationState: PENDING, ...OPEN_UNCLOSED },
];

const closure = (supply: typeof BAR, source: LeavingClosureChangeResponseSource) => ({
  coefficient: { id: `prev-${supply.id}` },
  sharingAgreement: PREVIOUS,
  supply,
  source,
  validToBefore: null,
  // Madrid midnight of 10/01/2026.
  validToAfter: "2026-01-09T23:00:00Z",
});

const dryRun = (overrides: Partial<CoefficientDatesEffectsResponse> = {}): CoefficientDatesEffectsResponse => ({
  coefficients: [],
  neighbours: [],
  leavingClosures: [],
  agreementStatuses: [],
  communityStart: { before: null, after: null },
  ...overrides,
});

async function openActivationAt(day: string, month: string, year: string) {
  const user = userEvent.setup({ delay: null });
  renderWithTheme({ coefficients: pending });
  await selectPendingRow(user, "Vivienda A");
  await selectPendingRow(user, "Vivienda B");
  await openBatchAction(user, "Registrar fecha");
  await typeDate(user, day, month, year);
  return user;
}

describe("SharingAgreementCoefficientSet (activation and leaving supplies)", () => {
  beforeEach(() => {
    mockActivateMutateAsync.mockReset();
    mockActivateMutateAsync.mockResolvedValue({ coefficients: [], leavingClosures: [] });
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("UI-AGR-037: asks the dry run with the selected coefficients at the chosen date and no listed closure", async () => {
    await openActivationAt("10", "01", "2026");

    await vi.waitFor(() => expect(mockPreviewDatesMutateAsync).toHaveBeenCalled());
    expect(mockPreviewDatesMutateAsync).toHaveBeenLastCalledWith({
      plantId: "plant-1",
      sharingAgreementId: "agreement-1",
      data: {
        coefficients: [
          { coefficientId: "c1", validFrom: "2026-01-10" },
          { coefficientId: "c2", validFrom: "2026-01-10" },
        ],
        leavingClosures: [],
      },
    });
  });

  it("UI-AGR-037: on a first activation, lists the leaving supplies it closes, with their previous agreement and closing day", async () => {
    mockPreviewDatesMutateAsync.mockResolvedValue(
      dryRun({
        leavingClosures: [
          closure(BAR, LeavingClosureChangeResponseSource.DEFAULT),
          closure(KIOSCO, LeavingClosureChangeResponseSource.DEFAULT),
        ],
      }),
    );
    await openActivationAt("10", "01", "2026");
    const dialog = screen.getByRole("dialog");

    const list = await within(dialog).findByRole("region", { name: "Salen del reparto (2)" });
    expect(list).toHaveTextContent("Tienen un coeficiente en otro acuerdo y no están en este. Su coeficiente se cierra en esta fecha.");
    expect(within(list).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Bar La Plaza · Reparto inicial 2023 · se cierra el 10/01/2026",
      "Kiosco · Reparto inicial 2023 · se cierra el 10/01/2026",
    ]);
    expect(within(dialog).getByRole("button", { name: "Registrar fecha" })).toBeEnabled();
  });

  it("UI-AGR-037: on a later activation the dry run closes nothing, and no list is shown", async () => {
    await openActivationAt("10", "01", "2026");
    const dialog = screen.getByRole("dialog");

    await vi.waitFor(() => expect(within(dialog).getByRole("button", { name: "Registrar fecha" })).toBeEnabled());
    expect(within(dialog).queryByRole("region", { name: /Salen del reparto/ })).not.toBeInTheDocument();
  });

  it("UI-AGR-037: 'Registrar fecha' waits for the list, saying so", async () => {
    mockPreviewDatesMutateAsync.mockReturnValue(new Promise(() => {}));
    await openActivationAt("10", "01", "2026");
    const dialog = screen.getByRole("dialog");

    expect(within(dialog).getByRole("button", { name: "Registrar fecha" })).toBeDisabled();
    expect(within(dialog).getByText("Calculando qué puntos salen del reparto…")).toBeVisible();
  });

  it("UI-AGR-037: a dry run refused with 409 shows each error in the catalogue's words and keeps 'Registrar fecha' disabled", async () => {
    mockPreviewDatesMutateAsync.mockRejectedValue(
      apiError(409, { code: "SHARING_AGREEMENT_COEFFICIENT_PERIOD_OVERLAP", params: { coefficientId: "c1", cups: "ES0031300000000001AB" } }),
    );
    await openActivationAt("10", "01", "2026");
    const dialog = screen.getByRole("dialog");

    expect(
      await within(dialog).findByText(
        "• CUPS ES0031300000000001AB: con esa fecha, su periodo se solaparía con otro coeficiente del mismo suministro.",
      ),
    ).toBeVisible();
    expect(within(dialog).getByText("Con esta fecha no se puede registrar: revisa los errores.")).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Registrar fecha" })).toBeDisabled();
    expect(within(dialog).queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  });

  it("UI-AGR-037: a dry run that fails on the network offers a retry, and only then lets the activation run", async () => {
    // The first answer for the day the field rests on fails; the days typed
    // on the way there ("0202") are answered and dropped.
    let failed = false;
    mockPreviewDatesMutateAsync.mockImplementation(async ({ data }) => {
      if (data.coefficients[0].validFrom === "2026-01-10" && !failed) {
        failed = true;
        throw new Error("Network Error");
      }
      return dryRun();
    });
    const user = await openActivationAt("10", "01", "2026");
    const dialog = screen.getByRole("dialog");

    expect(await within(dialog).findByText("No se pudo calcular qué puntos salen del reparto.", { selector: ".MuiAlert-message" })).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Registrar fecha" })).toBeDisabled();

    await user.click(within(dialog).getByRole("button", { name: "Reintentar" }));

    await vi.waitFor(() => expect(within(dialog).getByRole("button", { name: "Registrar fecha" })).toBeEnabled());
    await user.click(within(dialog).getByRole("button", { name: "Registrar fecha" }));
    expect(mockActivateMutateAsync).toHaveBeenCalledWith({
      plantId: "plant-1",
      sharingAgreementId: "agreement-1",
      data: { coefficientIds: ["c1", "c2"], appliedOn: "2026-01-10" },
    });
  });
});
