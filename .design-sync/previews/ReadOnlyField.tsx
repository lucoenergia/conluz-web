import { useState } from "react";
import { Mui, ReadOnlyField } from "conluz-web";

// Each variant sits next to an editable input, as it does in the app, so the
// difference between the two is what the card shows.
const Form = ({ children }: { children: React.ReactNode }) => (
  <Mui.Stack component="form" spacing={3} sx={{ width: "100%", maxWidth: 480 }}>
    {children}
  </Mui.Stack>
);

const EditableEmail = () => {
  const [value, setValue] = useState("ana.garcia@example.com");
  return <Mui.TextField label="Email" value={value} onChange={(event) => setValue(event.target.value)} fullWidth />;
};

export const Default = () => (
  <Form>
    <ReadOnlyField label="Nombre completo" value="Ana García Pérez" />
    <EditableEmail />
  </Form>
);

export const WithHelperText = () => (
  <Form>
    <ReadOnlyField label="DNI/NIE" value="12345678Z" helperText="Identifica su cuenta, así que no se cambia desde aquí." />
    <EditableEmail />
  </Form>
);

export const NoValue = () => (
  <Form>
    <ReadOnlyField label="Propietario" value="-" helperText="Para cambiarlo, usa «Cambiar titular» en el menú del punto de suministro." />
    <EditableEmail />
  </Form>
);
