import { useState } from "react";
import { EMPTY_SUPPLY_FIELD_VALUES, Mui, SupplyFormFields } from "conluz-web";

const member = (id: string, fullName: string, personalId: string) => ({ id, fullName, personalId }) as any;

const ROSTER = [
  member("1b5f9e2c-8d43-4a07-b6e1-c39a7d0f2e58", "Andrés Navarro Pons", "12345678Z"),
  member("4e2a7c91-0f36-4b58-9d1e-a83c5f6b2d07", "Lucía Ferrer Martí", "23456789D"),
  member("7c9d1e40-2b6a-4f83-8e5c-1d0a9b3f6e27", "Panadería Hermanos Soler, S.L.", "B98765432"),
];

/** The fields sit in a form overlay, stacked with its gap. */
const Form = ({ children }: { children: React.ReactNode }) => (
  <Mui.Box component="form" sx={{ width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 2 }}>
    {children}
  </Mui.Box>
);

export const Create = () => {
  const [values, setValues] = useState({ ...EMPTY_SUPPLY_FIELD_VALUES });
  return (
    <Form>
      <SupplyFormFields
        values={values}
        onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
        owner={{ mode: "choose", status: "ready", options: ROSTER }}
      />
    </Form>
  );
};

/** Editing shows the owner the supply already has; it is changed by transferring the supply. */
export const Edit = () => {
  const [values, setValues] = useState({
    name: "Casa de Lucía",
    cups: "ES0031406912345678JN0F",
    address: "Calle del Sol 14, 46900 Torrent, Valencia",
    addressRef: "1234567YJ2713S0001AB",
    ownerId: null,
  });
  return (
    <Form>
      <SupplyFormFields
        values={values}
        onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
        owner={{ mode: "show", fullName: "Lucía Ferrer Martí" }}
      />
    </Form>
  );
};

export const Refused = () => {
  const [values, setValues] = useState({
    name: "Local de la asociación",
    cups: "ES0031406912345678JN0F",
    address: "Plaza Mayor 2, 46900 Torrent, Valencia",
    addressRef: "",
    ownerId: ROSTER[0].id,
  });
  return (
    <Form>
      <SupplyFormFields
        values={values}
        onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
        owner={{ mode: "choose", status: "ready", options: ROSTER }}
        fieldErrors={{ cups: "Ya hay un punto de suministro con este CUPS en la comunidad." }}
      />
    </Form>
  );
};
