import type { ConfigureHuaweiBody } from "../../api/models";
import { colors } from "../../theme/tokens";
import { formatFieldList } from "../../utils/integrationCredentials";

/**
 * What GET /plants/{plantId}/production/huawei/config answers.
 *
 * The contract declares no schema for its 200, so the generated client types
 * it `unknown` and the screen casts it, as the integrations page did. The
 * endpoint's description documents the shape: the write body without the
 * password, plus `passwordSet`.
 */
export type StoredHuaweiConfig = Omit<ConfigureHuaweiBody, "password"> & { passwordSet?: boolean };

/**
 * The backend appends `/login`, `/getStationRealKpi` and `/getKpiStationHour`
 * to the base URL, so the FusionSolar `/thirdData` root is what an admin copies.
 */
export const HUAWEI_URL_PLACEHOLDER = "https://eu5.fusionsolar.huawei.com/thirdData";

export const HUAWEI_HELP =
  "Usa una cuenta de tipo Northbound API. Confirma con tu instalador la región correcta del endpoint.";

export const HUAWEI_ACCENT = colors.error.dark;

export const SAVE_FAILED_MESSAGE = "No se pudo guardar la configuración. Inténtalo de nuevo.";

export function isNotFound(error: unknown): boolean {
  return (error as { response?: { status?: number } } | null | undefined)?.response?.status === 404;
}

export const NOT_CONFIGURED_TEXT = "Esta planta aún no tiene configurada la integración con Huawei.";
export const LOAD_FAILED_TEXT = "No se pudo cargar la configuración de Huawei.";
export const SAVED_TEXT = "Configuración de Huawei guardada";
export const DISABLED_TEXT = "La integración está desactivada. Actívala para empezar a sincronizar.";
export const TOGGLE_FAILED_TEXT = "No se pudo cambiar el estado de la integración con Huawei. Inténtalo de nuevo.";

/** The visible message for a refused enable, naming what is missing. */
export const incompleteText = (labels: string[]) =>
  labels.length > 0
    ? `Faltan datos para activar la integración: ${formatFieldList(labels)}.`
    : "Faltan datos para activar la integración.";
