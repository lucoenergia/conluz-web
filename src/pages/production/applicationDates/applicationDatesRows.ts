import dayjs, { type Dayjs } from "dayjs";
import {
  CoefficientObservationResponseStatus,
  type CoefficientObservationResponse,
  type LeavingObservationResponse,
  type ObservedDateResponse,
  type SharingAgreementObservationResponse,
  type SharingAgreementPartitionCoefficientResponse,
  type SupplyReferenceResponse,
} from "../../../api/models";
import type { CoefficientDatesRequest } from "../../../hooks/actions/useSharingAgreementCoefficientActions";
import { pluralize } from "../../../utils/pluralize";
import { supplyDisplayLabel } from "../../../utils/supplyDisplayLabel";
import { localDateAt } from "../../../utils/zonedTime";
import { isCoefficientDateValid } from "../coefficientDateValidation";
import { formatDay, formatObservedDate, joinNames } from "../observedSharing/observedSharingFormat";

/**
 * Where a prefilled date came from (UI-AGR-032). An observed date is evidence;
 * a proposed one is the agreement's most frequent observed date, offered for a
 * coefficient whose change cannot be observed.
 */
export type PrefillKind = "observed" | "proposed";

/** A date the backend observed or proposed, exactly, beside the one in the field. */
export interface DateReference {
  kind: PrefillKind;
  /** Local date, "2024-02-01". */
  date: string;
}

/** One coefficient of the agreement in step 1. */
export interface CoefficientDateRow {
  coefficientId: string;
  supply: SupplyReferenceResponse;
  coefficient: number;
  /** The stored validFrom, as a local date; null while the coefficient is pending. */
  storedDate: string | null;
  selected: boolean;
  date: Dayjs | null;
  /** The picker's own validation error, for a typed date it refuses. */
  dateError: string | null;
  /** The exact observed or proposed date the field was prefilled with. */
  reference: DateReference | undefined;
  /** An observed range or open date the admin has to choose a day from (UI-AGR-032). */
  hint: string | undefined;
  /** A coefficient Datadis gives no data for. */
  noData: boolean;
  /** What the field says below itself while its row is unselected (UI-AGR-032). */
  unselectedReason: string;
}

/** A supply that leaves the distribution, as observed sharing saw it. */
export interface ObservedLeaving {
  supply: SupplyReferenceResponse;
  previousAgreementName: string;
  /** The exact observed leaving date, as a local date. */
  observed: string | undefined;
  /** An observed range or open leaving date, as the hint the field shows. */
  hint: string | undefined;
}

const isExact = (date: ObservedDateResponse | null): date is ObservedDateResponse & { from: string } =>
  date !== null && date.from !== null && date.from === date.to;

const isUncertain = (date: ObservedDateResponse | null): date is ObservedDateResponse =>
  date !== null && !isExact(date);

/** The date a row carries, or null: never a day the backend did not give (#419 out of scope). */
const toDay = (localDate: string) => dayjs(localDate);

const NO_CHANGE = "Sin cambios";

const NOT_OBSERVABLE_REASON =
  "Punto de la planta: Datadis no permite observar su fecha. Normalmente es la misma que la del resto del acuerdo; márcalo y ponla a mano.";

const REFERENCE_WORD = { observed: "Observada", proposed: "Propuesta" } as const;

/** Why a row with an observed or proposed range, or an open date, is unselected. */
function uncertainReason(kind: PrefillKind, date: ObservedDateResponse): string {
  if (date.from === null) {
    return `${REFERENCE_WORD[kind]} el ${formatDay(date.to)} o antes: Datadis no tiene datos anteriores. Elige la fecha real y márcalo.`;
  }
  return `${REFERENCE_WORD[kind]} entre el ${formatDay(date.from)} y el ${formatDay(date.to)}. Elige una fecha y márcalo.`;
}

/**
 * Why an already dated row with an exact observed or proposed date is
 * unselected. A proposed date is no evidence, so it never confirms the stored one.
 */
function datedReason(storedDate: string, reference: DateReference): string {
  if (reference.kind === "observed" && reference.date === storedDate) return "Fecha registrada correcta.";
  return `Registrada ${formatDay(storedDate)} · ${REFERENCE_WORD[reference.kind]} ${formatDay(reference.date)}. Márcalo para ${
    reference.kind === "observed" ? "corregirla" : "usarla"
  }.`;
}

/**
 * Step 1's rows, in the order the agreement lists its coefficients.
 *
 * Opened from the agreement (no observation), every field is empty and the
 * undated coefficients are selected (UI-AGR-032). Opened from observed
 * sharing, an exact observed date or an exact proposed date is prefilled and
 * marked; a range or an open date ("o antes") is left empty with the observed
 * value as a hint; any other row shows its stored date, or nothing. A row with
 * a prefilled date is selected; a range or open row is not, nor is a row
 * already dated, whatever the observation says: a correction is an explicit
 * choice. An already dated row gets its exact observed or proposed date only
 * once it is marked (`withSelection`). Each row carries why it is unselected.
 */
export function initialDateRows(
  coefficients: SharingAgreementPartitionCoefficientResponse[],
  observation: SharingAgreementObservationResponse | undefined,
): CoefficientDateRow[] {
  const observedById = new Map<string, CoefficientObservationResponse>(
    (observation?.coefficients ?? []).map((row) => [row.coefficientId, row]),
  );

  return coefficients.map((coefficient) => {
    const storedDate = coefficient.validFrom ? localDateAt(coefficient.validFrom) : null;
    const base: CoefficientDateRow = {
      coefficientId: coefficient.coefficientId,
      supply: coefficient.supply,
      coefficient: coefficient.coefficient,
      storedDate,
      selected: false,
      date: null,
      dateError: null,
      reference: undefined,
      hint: undefined,
      noData: false,
      unselectedReason: NO_CHANGE,
    };

    if (!observation) return { ...base, selected: storedDate === null };

    const observed = observedById.get(coefficient.coefficientId);
    const isNotDistinguishable = observed?.status === CoefficientObservationResponseStatus.NOT_DISTINGUISHABLE;
    const candidate = isNotDistinguishable ? (observed?.proposedDate ?? null) : (observed?.observedDate ?? null);
    const kind: PrefillKind = isNotDistinguishable ? "proposed" : "observed";

    if (isExact(candidate)) {
      const reference: DateReference = { kind, date: candidate.to };
      if (storedDate !== null) return { ...base, reference, unselectedReason: datedReason(storedDate, reference) };
      return { ...base, selected: true, date: toDay(candidate.to), reference };
    }
    if (isUncertain(candidate)) {
      return { ...base, hint: formatObservedDate(candidate), unselectedReason: uncertainReason(kind, candidate) };
    }
    return {
      ...base,
      date: storedDate ? toDay(storedDate) : null,
      noData: observed?.status === CoefficientObservationResponseStatus.NO_DATA,
      unselectedReason:
        observed?.status === CoefficientObservationResponseStatus.NOT_OBSERVABLE ? NOT_OBSERVABLE_REASON : NO_CHANGE,
    };
  });
}

/**
 * A row marked or unmarked. An already dated row holds its exact observed or
 * proposed date only while marked, so an unmarked one never shows it as the
 * field's value (UI-AGR-032).
 */
export function withSelection(row: CoefficientDateRow, selected: boolean): CoefficientDateRow {
  if (row.storedDate === null || row.reference === undefined) return { ...row, selected };
  return { ...row, selected, date: selected ? toDay(row.reference.date) : null, dateError: null };
}

/** The supplies observed sharing saw leave the distribution with this agreement. */
export function observedLeavings(observation: SharingAgreementObservationResponse | undefined): ObservedLeaving[] {
  return (observation?.leavingRows ?? []).map((row: LeavingObservationResponse) => ({
    supply: row.supply,
    previousAgreementName: row.previousSharingAgreement.name,
    observed: isExact(row.observedLeavingDate) ? row.observedLeavingDate.to : undefined,
    hint: isUncertain(row.observedLeavingDate) ? formatObservedDate(row.observedLeavingDate) : undefined,
  }));
}

/** A closing date the admin entered for a leaving supply, by supply id. */
export interface LeavingDate {
  date: Dayjs | null;
  dateError: string | null;
}

/** Each leaving supply observed on an exact day starts with that day as its closing date (UI-AGR-032). */
export function initialLeavingDates(leavings: ObservedLeaving[]): Record<string, LeavingDate> {
  return Object.fromEntries(
    leavings
      .filter((leaving) => leaving.observed !== undefined)
      .map((leaving) => [leaving.supply.id, { date: toDay(leaving.observed!), dateError: null }]),
  );
}

const isUsable = ({ date, dateError }: { date: Dayjs | null; dateError: string | null }) =>
  isCoefficientDateValid(date, dateError);

/**
 * Why "Ver vista previa" stays disabled, or null when the preview may run
 * (UI-AGR-033): a selected row with no date, or with a date that is invalid or
 * in the future, keeps it disabled; so does a request with nothing in it.
 */
export function previewBlocker(rows: CoefficientDateRow[], leavingDates: Record<string, LeavingDate>): string | null {
  const selected = rows.filter((row) => row.selected);
  const missing = selected.filter((row) => row.date === null);
  const invalid = selected.filter((row) => row.date !== null && !isUsable(row));
  const listedLeavings = Object.values(leavingDates).filter(isUsable);

  if (missing.length === 0 && invalid.length === 0) {
    return selected.length === 0 && listedLeavings.length === 0 ? "Marca al menos un punto para ver la vista previa." : null;
  }

  if (invalid.length === 0 && missing.length <= 3) {
    const names = joinNames(missing.map((row) => supplyDisplayLabel(row.supply)));
    return missing.length === 1
      ? `Falta 1 fecha: ${names}. Escríbela o desmarca ese punto.`
      : `Faltan ${missing.length} fechas: ${names}. Escríbelas o desmarca esos puntos.`;
  }

  const parts = [
    missing.length > 0 && `${pluralize(missing.length, "Falta", "Faltan")} ${missing.length} ${pluralize(missing.length, "fecha", "fechas")}`,
    invalid.length > 0 &&
      `${missing.length > 0 ? "hay" : "Hay"} ${invalid.length} ${pluralize(invalid.length, "fecha no válida o futura", "fechas no válidas o futuras")}`,
  ].filter(Boolean);
  const fix = missing.length + invalid.length === 1 ? "Corrígela o desmarca ese punto." : "Corrígelas o desmarca esos puntos.";
  return `${parts.join(" y ")}. ${fix}`;
}

/**
 * The request steps 2 and 3 send: the selected rows, each with its own date,
 * and the leaving supplies given a usable closing date, listed (UI-AGR-034).
 * Only called once `previewBlocker` has nothing to say, so every selected row
 * has a usable date.
 */
export function buildDatesRequest(rows: CoefficientDateRow[], leavingDates: Record<string, LeavingDate>): CoefficientDatesRequest {
  return {
    coefficients: rows
      .filter((row) => row.selected && row.date !== null)
      .map((row) => ({ coefficientId: row.coefficientId, validFrom: row.date! })),
    leavingClosures: Object.entries(leavingDates)
      .filter(([, leaving]) => isUsable(leaving))
      .map(([supplyId, leaving]) => ({ supplyId, closedOn: leaving.date! })),
  };
}

/** A request as text, to tell whether the preview on screen is the preview of what is entered now. */
export function requestKey(request: CoefficientDatesRequest): string {
  return JSON.stringify({
    coefficients: request.coefficients.map(({ coefficientId, validFrom }) => [coefficientId, validFrom.format("YYYY-MM-DD")]),
    leavingClosures: request.leavingClosures.map(({ supplyId, closedOn }) => [supplyId, closedOn.format("YYYY-MM-DD")]),
  });
}

/** Whether a field holds a day other than the one it was prefilled with. */
export function isEdited(date: Dayjs | null, reference: string | undefined): boolean {
  return reference !== undefined && (date === null || date.format("YYYY-MM-DD") !== reference);
}
