import dayjs, { type Dayjs } from "dayjs";
import type { PlantResponse, SupplyResponse } from "../../api/models";

/** What the fields hold. The supply is the chosen supply's code, `null` for none. */
export interface PlantFieldValues {
  providerCode: string;
  regulatoryCode: string;
  name: string;
  address: string;
  description: string;
  /** As typed, so that an empty or partial number stays what the user sees. */
  totalPower: string;
  connectionDate: Dayjs | null;
  supplyCode: string | null;
}

/** The inputs an error can be shown on. */
export type PlantFormField = "providerCode" | "name" | "supplyCode" | "address" | "totalPower";

export const EMPTY_PLANT_FIELD_VALUES: PlantFieldValues = {
  providerCode: "",
  regulatoryCode: "",
  name: "",
  address: "",
  description: "",
  totalPower: "",
  connectionDate: null,
  supplyCode: null,
};

/** The values an existing plant opens the form with. */
export function plantFieldValuesOf(plant: PlantResponse): PlantFieldValues {
  return {
    providerCode: plant.providerCode,
    regulatoryCode: plant.regulatoryCode ?? "",
    name: plant.name,
    address: plant.address,
    description: plant.description ?? "",
    totalPower: String(plant.totalPower),
    connectionDate: plant.connectionDate ? dayjs(plant.connectionDate) : null,
    supplyCode: plant.supply.code,
  };
}

/**
 * The chosen supply, resolved against the options on every render: a list for
 * another community does not hold it, so the selection clears itself.
 */
export function selectedSupplyOf(options: SupplyResponse[], supplyCode: string | null): SupplyResponse | null {
  if (!supplyCode) return null;
  return options.find((supply) => supply.code === supplyCode) ?? null;
}

/** A total power the backend accepts: a number above zero. */
export function totalPowerIsValid(input: string): boolean {
  const num = Number(input);
  return !isNaN(num) && num > 0;
}

export const TOTAL_POWER_ERROR = "Por favor, introduce un número mayor que 0";
