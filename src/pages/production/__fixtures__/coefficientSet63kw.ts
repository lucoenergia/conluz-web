import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
} from "../../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../../api/models";

/**
 * A realistic coefficient set for the manual editor's tests: a 29-supply
 * community on a 63,00 kW plant, summing to EXACTLY 1 000 000 millionths.
 *
 * Size and installed power both matter. 63 kW is the issue's reproduction
 * figure, and at two kW decimals it makes the kW projection badly lossy --
 * roughly 159 distinct coefficients all render as "1,94 kW". A small fixture
 * hides that: with a handful of round coefficients on a round plant every kW
 * string happens to round-trip, and a test built on one would still pass
 * against an editor that loses the value.
 *
 * "Vivienda 5ºC" is pinned at 30770 millionths -- 1,94 kW at 63 kW installed,
 * 3,0770 percent -- the exact row from the bug report. Retyping the "1,94" it
 * displays yields 30794, not 30770: that one-row, 24-millionth drift is what
 * moves the whole set off 100 percent.
 *
 * Every row is PENDING/OPEN, which is what the backend guarantees for a real
 * DRAFT -- the only status the editor opens in.
 */
const PENDING_OPEN = {
  applicationState: SharingAgreementPartitionCoefficientResponseApplicationState.PENDING,
  validFrom: null,
  validTo: null,
  endState: SharingAgreementPartitionCoefficientResponseEndState.OPEN,
  endDate: null,
  currentCoefficient: null,
};

/** Installed power the editor's kW mode renders against. */
export const FIXTURE_INSTALLED_POWER_KW = 63;

/** The reproduction row's canonical value, in 1e-6 units. */
export const REPRODUCTION_ROW_UNITS = 30770;

/** Supply id of the row pinned to REPRODUCTION_ROW_UNITS. */
export const REPRODUCTION_ROW_SUPPLY_ID = "supply-15";

/** Display name of that same row, for accessible-name queries. */
export const REPRODUCTION_ROW_NAME = "Vivienda 5ºC";

export const FIXTURE_COEFFICIENTS: SharingAgreementPartitionCoefficientResponse[] = [
  { coefficientId: "coef-01", supply: { id: "supply-01", name: "Vivienda 1ºA", code: "ES0031300000000001XY" }, coefficient: 0.017499, ...PENDING_OPEN },
  { coefficientId: "coef-02", supply: { id: "supply-02", name: "Vivienda 1ºB", code: "ES0031300000000002XY" }, coefficient: 0.050551, ...PENDING_OPEN },
  { coefficientId: "coef-03", supply: { id: "supply-03", name: "Vivienda 1ºC", code: "ES0031300000000003XY" }, coefficient: 0.045288, ...PENDING_OPEN },
  { coefficientId: "coef-04", supply: { id: "supply-04", name: "Vivienda 2ºA", code: "ES0031300000000004XY" }, coefficient: 0.040041, ...PENDING_OPEN },
  { coefficientId: "coef-05", supply: { id: "supply-05", name: "Vivienda 2ºB", code: "ES0031300000000005XY" }, coefficient: 0.053940, ...PENDING_OPEN },
  { coefficientId: "coef-06", supply: { id: "supply-06", name: "Vivienda 2ºC", code: "ES0031300000000006XY" }, coefficient: 0.023303, ...PENDING_OPEN },
  { coefficientId: "coef-07", supply: { id: "supply-07", name: "Vivienda 3ºA", code: "ES0031300000000007XY" }, coefficient: 0.027131, ...PENDING_OPEN },
  { coefficientId: "coef-08", supply: { id: "supply-08", name: "Vivienda 3ºB", code: "ES0031300000000008XY" }, coefficient: 0.035532, ...PENDING_OPEN },
  { coefficientId: "coef-09", supply: { id: "supply-09", name: "Vivienda 3ºC", code: "ES0031300000000009XY" }, coefficient: 0.018474, ...PENDING_OPEN },
  { coefficientId: "coef-10", supply: { id: "supply-10", name: "Vivienda 4ºA", code: "ES0031300000000010XY" }, coefficient: 0.022833, ...PENDING_OPEN },
  { coefficientId: "coef-11", supply: { id: "supply-11", name: "Vivienda 4ºB", code: "ES0031300000000011XY" }, coefficient: 0.040988, ...PENDING_OPEN },
  { coefficientId: "coef-12", supply: { id: "supply-12", name: "Vivienda 4ºC", code: "ES0031300000000012XY" }, coefficient: 0.051668, ...PENDING_OPEN },
  { coefficientId: "coef-13", supply: { id: "supply-13", name: "Vivienda 5ºA", code: "ES0031300000000013XY" }, coefficient: 0.031273, ...PENDING_OPEN },
  { coefficientId: "coef-14", supply: { id: "supply-14", name: "Vivienda 5ºB", code: "ES0031300000000014XY" }, coefficient: 0.016077, ...PENDING_OPEN },
  { coefficientId: "coef-15", supply: { id: "supply-15", name: "Vivienda 5ºC", code: "ES0031300000000015XY" }, coefficient: 0.030770, ...PENDING_OPEN },
  { coefficientId: "coef-16", supply: { id: "supply-16", name: "Vivienda 6ºA", code: "ES0031300000000016XY" }, coefficient: 0.018368, ...PENDING_OPEN },
  { coefficientId: "coef-17", supply: { id: "supply-17", name: "Vivienda 6ºB", code: "ES0031300000000017XY" }, coefficient: 0.033288, ...PENDING_OPEN },
  { coefficientId: "coef-18", supply: { id: "supply-18", name: "Vivienda 6ºC", code: "ES0031300000000018XY" }, coefficient: 0.052615, ...PENDING_OPEN },
  { coefficientId: "coef-19", supply: { id: "supply-19", name: "Ático Izquierda", code: "ES0031300000000019XY" }, coefficient: 0.020281, ...PENDING_OPEN },
  { coefficientId: "coef-20", supply: { id: "supply-20", name: "Ático Derecha", code: "ES0031300000000020XY" }, coefficient: 0.025984, ...PENDING_OPEN },
  { coefficientId: "coef-21", supply: { id: "supply-21", name: "Local Comercial 1", code: "ES0031300000000021XY" }, coefficient: 0.024797, ...PENDING_OPEN },
  { coefficientId: "coef-22", supply: { id: "supply-22", name: "Local Comercial 2", code: "ES0031300000000022XY" }, coefficient: 0.048605, ...PENDING_OPEN },
  { coefficientId: "coef-23", supply: { id: "supply-23", name: "Panadería El Horno", code: "ES0031300000000023XY" }, coefficient: 0.046554, ...PENDING_OPEN },
  { coefficientId: "coef-24", supply: { id: "supply-24", name: "Bar La Plaza", code: "ES0031300000000024XY" }, coefficient: 0.023347, ...PENDING_OPEN },
  { coefficientId: "coef-25", supply: { id: "supply-25", name: "Peluquería Nuria", code: "ES0031300000000025XY" }, coefficient: 0.031746, ...PENDING_OPEN },
  { coefficientId: "coef-26", supply: { id: "supply-26", name: "Garaje comunitario", code: "ES0031300000000026XY" }, coefficient: 0.047911, ...PENDING_OPEN },
  { coefficientId: "coef-27", supply: { id: "supply-27", name: "Trastero comunitario", code: "ES0031300000000027XY" }, coefficient: 0.035105, ...PENDING_OPEN },
  { coefficientId: "coef-28", supply: { id: "supply-28", name: "Portería", code: "ES0031300000000028XY" }, coefficient: 0.035237, ...PENDING_OPEN },
  { coefficientId: "coef-29", supply: { id: "supply-29", name: "Sala de la comunidad", code: "ES0031300000000029XY" }, coefficient: 0.050794, ...PENDING_OPEN },
];
