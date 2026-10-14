import type { ConfigureHuaweiBody } from "../../api/models";
import { colors } from "../../theme/tokens";

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
