import type { PlantResponseInverterProvider } from "../api/models";

/**
 * Each inverter provider by its name. A Record over the generated enum, so a
 * provider the API adds fails type checking here instead of reaching the
 * screen as its raw code.
 */
const INVERTER_PROVIDER_LABELS: Record<PlantResponseInverterProvider, string> = {
  HUAWEI: "Huawei",
};

/** The inverter provider as a person names it ("Huawei"), never the API's code ("HUAWEI"). */
export function inverterProviderLabel(provider: PlantResponseInverterProvider): string {
  return INVERTER_PROVIDER_LABELS[provider];
}
