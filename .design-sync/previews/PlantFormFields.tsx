import { useState } from "react";
import { EMPTY_PLANT_FIELD_VALUES, Mui, PlantFormFields, plantFieldValuesOf } from "conluz-web";

const supply = (id: string, code: string, name: string) =>
  ({ id, code, name, address: "", partitionCoefficient: 0, enabled: true, plant: null, ownerRecord: null }) as any;

const POLIDEPORTIVO = supply("b2d7e3f0-5a61-4c8e-9e02-7d4f1a6c3b95", "ES0031406987654321QW1A", "Cubierta del polideportivo");
const SUPPLIES = [POLIDEPORTIVO, supply("9a0e4c1b-7f25-4d63-8b19-c5e2f7a03d68", "ES0031406955512345AB3K", "Escuela municipal")];

/** An existing plant, shaped like GET …/plants/{plantId}. */
const PLANT = {
  id: "e7c41f0a-2b58-4d96-8a3e-61f9d0c2b7a4",
  providerCode: "NE=34567890",
  regulatoryCode: "ES0031406987654321QW1AA001",
  cil: "ES0031406987654321QW1A001",
  name: "Polideportivo Municipal",
  address: "Avenida del Deporte 3, 46900 Torrent, Valencia",
  description: "Cubierta de la pista cubierta, orientación sur.",
  peakPowerKWp: 99.84,
  nominalPowerKW: 90,
  connectionDate: "2025-03-14",
  supply: { id: POLIDEPORTIVO.id, code: POLIDEPORTIVO.code },
} as any;

const Form = ({ children }: { children: React.ReactNode }) => (
  <Mui.Box component="form" sx={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: 2 }}>
    {children}
  </Mui.Box>
);

export const Create = () => {
  const [values, setValues] = useState({ ...EMPTY_PLANT_FIELD_VALUES });
  return (
    <Form>
      <PlantFormFields
        values={values}
        onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
        supplies={SUPPLIES}
        selectedSupply={SUPPLIES.find((s) => s.code === values.supplyCode) ?? null}
      />
    </Form>
  );
};

/** Editing keeps the plant's supply: the selector is disabled. */
export const Edit = () => {
  const [values, setValues] = useState(plantFieldValuesOf(PLANT));
  return (
    <Form>
      <PlantFormFields
        values={values}
        onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
        supplies={SUPPLIES}
        selectedSupply={POLIDEPORTIVO}
        disableSupplySelector
      />
    </Form>
  );
};

export const Refused = () => {
  const [values, setValues] = useState({ ...plantFieldValuesOf(PLANT), cil: "ES0031406987654321QW1" });
  return (
    <Form>
      <PlantFormFields
        values={values}
        onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
        supplies={SUPPLIES}
        selectedSupply={POLIDEPORTIVO}
        disableSupplySelector
        fieldErrors={{ cil: "El CIL debe tener 25 letras o números." }}
      />
    </Form>
  );
};
