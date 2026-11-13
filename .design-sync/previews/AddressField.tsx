import { useState } from "react";
import { AddressField, Mui } from "conluz-web";

const LONG_ADDRESS =
  "Partida de la Rambleta, Polígono 12, Parcela 345, Camino del Molino Viejo s/n, junto a la depuradora municipal, 46470 Catarroja, Valencia";

const Form = ({ children }: { children: React.ReactNode }) => (
  <Mui.Box component="form" onSubmit={(event: React.FormEvent) => event.preventDefault()} sx={{ width: "100%", maxWidth: 480 }}>
    {children}
  </Mui.Box>
);

export const Empty = () => {
  const [value, setValue] = useState("");
  return (
    <Form>
      <AddressField label="Dirección" value={value} onValueChange={setValue} required />
    </Form>
  );
};

export const LongAddress = () => {
  const [value, setValue] = useState(LONG_ADDRESS);
  return (
    <Form>
      <AddressField label="Dirección" value={value} onValueChange={setValue} required />
    </Form>
  );
};

export const WithError = () => {
  const [value, setValue] = useState(LONG_ADDRESS);
  return (
    <Form>
      <AddressField
        label="Dirección"
        value={value}
        onValueChange={setValue}
        error
        helperText="La dirección puede tener como máximo 250 caracteres. Ahora tiene 251."
      />
    </Form>
  );
};

export const ReadOnly = () => (
  <Form>
    <AddressField label="Dirección" value="Calle de la Paz 12, 46003 València" onValueChange={() => {}} readOnly />
  </Form>
);
