import {
  SharingAnomalyResponseType,
  type ObservedDateResponse,
  type PlantResponse,
  type PlantSharingObservationResponse,
  type SharingAnomalyResponse,
} from "../../../api/models";
import { formatPercentage } from "../../../utils/formatPercentage";
import { groupAnomalies } from "./anomalyGroups";
import { formatDay } from "./observedSharingFormat";

/**
 * The anomalies the distributor answers for (UI-AGR-047). APPLIED_BEFORE_SENT
 * is left out: it usually means the sent date registered in Conluz is wrong.
 */
const CLAIMABLE_TYPES: ReadonlySet<SharingAnomalyResponseType> = new Set([
  SharingAnomalyResponseType.NOT_APPLIED,
  SharingAnomalyResponseType.UNKNOWN_COEFFICIENT,
  SharingAnomalyResponseType.REVERTED,
  SharingAnomalyResponseType.ENERGY_OUTSIDE_AGREEMENT,
  SharingAnomalyResponseType.NO_ENERGY_IN_AGREEMENT,
]);

/** The agreement a claimed anomaly is attributed to, as the claim names it. */
interface ClaimedAgreement {
  name: string;
  distributorFileSentOn: string | null;
}

export interface ClaimableAnomaly {
  anomaly: SharingAnomalyResponse;
  /** Undefined for an anomaly attributed to no agreement. */
  agreement?: ClaimedAgreement;
}

/**
 * The plant's claimable anomalies, attributed and not, in the order the page
 * lists them (UI-AGR-024): grouped as the page groups them, then filtered, so a
 * supply keeps its place even when its first anomaly is not claimable.
 */
export function claimableAnomalies(observation: PlantSharingObservationResponse): ClaimableAnomaly[] {
  const sentOn = new Map(
    observation.sharingAgreements.map((summary) => [summary.sharingAgreement.id, summary.distributorFileSentOn]),
  );
  return groupAnomalies(observation.sharingAgreements, observation.unattributedAnomalies).flatMap((group) => {
    const agreement = group.agreement && {
      name: group.agreement.name,
      distributorFileSentOn: sentOn.get(group.agreement.id) ?? null,
    };
    return group.supplies
      .flatMap(({ anomalies }) => anomalies)
      .filter((anomaly) => CLAIMABLE_TYPES.has(anomaly.type))
      .map((anomaly) => ({ anomaly, agreement }));
  });
}

/**
 * A share on the 0-1 scale as a Spanish percentage number with its decimals and
 * without its sign: the template writes " %" itself, with a plain space.
 */
const percentNumber = (value: number, decimals: number) =>
  formatPercentage(value, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).replace(/\s*%$/, "");

/** A registered coefficient is exact: 4 decimals (UI-AGR-048). */
const registered = (expectedBeta: number | null) =>
  expectedBeta === null ? "[COEFICIENTE COMUNICADO]" : percentNumber(expectedBeta, 4);

/** An observed β is approximate: 2 decimals, always after "aproximadamente" in the sentence (UI-AGR-048). */
const observed = (observedBeta: number) => percentNumber(observedBeta, 2);

/** The agreement the sentence refers the distributor to, or a placeholder when none is attributed. */
function agreementReference(agreement: ClaimedAgreement | undefined): string {
  if (!agreement) return "(reparto «[NOMBRE DEL REPARTO]»)";
  const sentOn = agreement.distributorFileSentOn ? formatDay(agreement.distributorFileSentOn) : "[FECHA DE ENVÍO]";
  return `(reparto «${agreement.name}», fichero enviado el ${sentOn})`;
}

/** What the distributor applied, by type, and, for a swap, the supply it is swapped with by its CUPS. */
function sentence({ anomaly, agreement }: ClaimableAnomaly): string {
  const reference = agreementReference(agreement);
  const expected = registered(anomaly.expectedBeta);
  const beta = observed(anomaly.observedBeta);
  switch (anomaly.type) {
    case SharingAnomalyResponseType.NOT_APPLIED: {
      const text = `No se le ha aplicado el coeficiente comunicado de ${expected} %; recibe aproximadamente un ${beta} % ${reference}.`;
      return anomaly.swappedWith
        ? `${text} Este porcentaje coincide con el coeficiente comunicado para el punto CUPS ${anomaly.swappedWith.code}, y a ese punto se le aplica el de este: los coeficientes de ambos puntos parecen intercambiados.`
        : text;
    }
    case SharingAnomalyResponseType.UNKNOWN_COEFFICIENT:
      return `Se le ha aplicado aproximadamente un ${beta} %, cuando el coeficiente comunicado es ${expected} % ${reference}.`;
    case SharingAnomalyResponseType.REVERTED:
      return `Se le vuelve a aplicar aproximadamente un ${beta} %, que corresponde a un reparto anterior, en lugar del coeficiente comunicado de ${expected} % ${reference}.`;
    case SharingAnomalyResponseType.ENERGY_OUTSIDE_AGREEMENT:
      return `Recibe aproximadamente un ${beta} % de la energía de la instalación, aunque no figura en el reparto comunicado.`;
    case SharingAnomalyResponseType.NO_ENERGY_IN_AGREEMENT:
      return `No recibe energía de la instalación, aunque su coeficiente comunicado es ${expected} % ${reference}.`;
    default:
      throw new Error(`Not a claimable anomaly type: ${anomaly.type}`);
  }
}

/**
 * When the anomaly lasted. A start the data pins to one day reads "del …";
 * one known only within a range, or one the data starts on, reads "desde …".
 */
function period(start: ObservedDateResponse, end: string | null, analysedTo: string): string {
  const until = end === null ? `la fecha de los últimos datos publicados (${formatDay(analysedTo)})` : `el ${formatDay(end)}`;
  if (start.from === start.to) {
    return end === null ? `desde el ${formatDay(start.to)} hasta ${until}` : `del ${formatDay(start.to)} al ${formatDay(end)}`;
  }
  const from =
    start.from === null
      ? `desde el ${formatDay(start.to)} o antes`
      : `desde una fecha entre el ${formatDay(start.from)} y el ${formatDay(start.to)}`;
  return `${from} hasta ${until}`;
}

/**
 * The claim to the distributor (UI-AGR-048): plain text from the fixed
 * template of #436, with what the observed sharing response says filled in and
 * the rest left as bracketed placeholders. Supplies are named by their CUPS
 * only; nothing internal to Conluz, such as a supply's or the plant's name,
 * appears. One numbered item per claimable anomaly, in page order (UI-AGR-047).
 * Built from the response already on the page; nothing is requested.
 */
export function buildClaimText(
  observation: PlantSharingObservationResponse,
  plant: Pick<PlantResponse, "regulatoryCode">,
): string {
  const cau = plant.regulatoryCode?.trim() || "[CAU]";
  const analysedTo = observation.analysis.analysedTo ?? "";
  const items = claimableAnomalies(observation).map(
    (item, index) =>
      `${index + 1}. CUPS ${item.anomaly.supply.code}.\n${sentence(item)}\nPeriodo: ${period(item.anomaly.start, item.anomaly.end, analysedTo)}.`,
  );

  return [
    `Asunto: Revisión del reparto de autoconsumo colectivo – CAU ${cau}`,
    "Estimados señores de [NOMBRE DE LA DISTRIBUIDORA]:",
    `Me dirijo a ustedes en nombre de [NOMBRE DE LA COMUNIDAD O DEL TITULAR], en relación con la instalación de autoconsumo colectivo con CAU ${cau}.`,
    "Según los datos de consumo y producción publicados en Datadis, en los siguientes puntos de suministro el reparto aplicado no coincide con los coeficientes comunicados:",
    ...items,
    "Les solicito que revisen la aplicación de los coeficientes en estos puntos de suministro, que corrijan el reparto conforme a los coeficientes comunicados y que, en su caso, regularicen la facturación del periodo afectado. [AÑADIR O QUITAR PETICIONES]",
    "Quedo a la espera de su respuesta. Pueden contactar conmigo en [TELÉFONO O CORREO ELECTRÓNICO].",
    "Atentamente,\n[NOMBRE Y APELLIDOS]\n[CARGO EN LA COMUNIDAD]",
    "Nota: los porcentajes observados son aproximados y se han calculado a partir de los datos diarios publicados en Datadis.",
  ].join("\n\n");
}
