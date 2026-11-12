import dayjs, { type Dayjs } from "dayjs";
import type { PlantResponse, SupplyResponse } from "../../api/models";
import { CIL_FORMAT_MESSAGE, normaliseCil } from "../../errors/plantCil";

/** What the fields hold. The supply is the chosen supply's code, `null` for none. */
export interface PlantFieldValues {
  providerCode: string;
  regulatoryCode: string;
  /** As typed: normalised only when it is sent. */
  cil: string;
  name: string;
  address: string;
  description: string;
  /** As typed, so that an empty or partial number stays what the user sees. */
  peakPowerKWp: string;
  /** As typed, like the peak power. */
  nominalPowerKW: string;
  connectionDate: Dayjs | null;
  supplyCode: string | null;
}

/** The inputs an error can be shown on. */
export type PlantFormField = "providerCode" | "cil" | "name" | "supplyCode" | "address" | "peakPowerKWp" | "nominalPowerKW";

/** The inputs an error can be shown on, in the order the form shows them. */
const FORM_ORDER: readonly PlantFormField[] = [
  "providerCode",
  "cil",
  "name",
  "supplyCode",
  "address",
  "peakPowerKWp",
  "nominalPowerKW",
];

export const EMPTY_PLANT_FIELD_VALUES: PlantFieldValues = {
  providerCode: "",
  regulatoryCode: "",
  cil: "",
  name: "",
  address: "",
  description: "",
  peakPowerKWp: "",
  nominalPowerKW: "",
  connectionDate: null,
  supplyCode: null,
};

/** The values an existing plant opens the form with. */
export function plantFieldValuesOf(plant: PlantResponse): PlantFieldValues {
  return {
    providerCode: plant.providerCode,
    regulatoryCode: plant.regulatoryCode ?? "",
    cil: plant.cil ?? "",
    name: plant.name,
    address: plant.address,
    description: plant.description ?? "",
    peakPowerKWp: String(plant.peakPowerKWp),
    nominalPowerKW: String(plant.nominalPowerKW),
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

/** A peak or nominal power the backend accepts: a number above zero. */
export function powerIsValid(input: string): boolean {
  const num = Number(input);
  return !isNaN(num) && num > 0;
}

export const POWER_ERROR = "Por favor, introduce un número mayor que 0";

/** The power inputs, checked as they are typed. */
export const POWER_FIELDS = ["peakPowerKWp", "nominalPowerKW"] as const;

/** What each required input says when it is left empty. */
const REQUIRED: [PlantFormField, string][] = [
  ["providerCode", "El código de proveedor es obligatorio"],
  ["name", "El nombre es obligatorio"],
  ["supplyCode", "El punto de suministro es obligatorio"],
  ["address", "La dirección es obligatoria"],
];

/**
 * Every input the backend would refuse, with what it says, in the order the
 * form shows them. Empty when the values can be sent. The supply counts only
 * once it resolves against the options, so a stale code is not "chosen".
 */
export function plantFieldErrors(
  values: PlantFieldValues,
  selectedSupply: SupplyResponse | null,
): [PlantFormField, string][] {
  const errors = REQUIRED.filter(([field]) =>
    field === "supplyCode" ? !selectedSupply : !values[field],
  );
  // An empty CIL is no CIL; any other must be one the backend accepts.
  if (!normaliseCil(values.cil).valid) errors.push(["cil", CIL_FORMAT_MESSAGE]);
  // Each power on its own: neither is compared with the other.
  for (const field of POWER_FIELDS) {
    if (!powerIsValid(values[field])) errors.push([field, POWER_ERROR]);
  }
  return errors.sort(([a], [b]) => FORM_ORDER.indexOf(a) - FORM_ORDER.indexOf(b));
}
