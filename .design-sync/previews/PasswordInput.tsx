import { PasswordInput, Mui } from "conluz-web";

export const Empty = () => (
  <Mui.Box sx={{ maxWidth: 400 }}>
    <PasswordInput label="Contraseña" fullWidth autoComplete="current-password" defaultValue="" />
  </Mui.Box>
);

export const Filled = () => (
  <Mui.Box sx={{ maxWidth: 400 }}>
    <PasswordInput label="Contraseña" fullWidth autoComplete="current-password" defaultValue="el gato duerme junto a la ventana" />
  </Mui.Box>
);

export const WithError = () => (
  <Mui.Box sx={{ maxWidth: 400 }}>
    <PasswordInput
      label="Confirmar contraseña"
      fullWidth
      required
      autoComplete="new-password"
      defaultValue="el gato duerme"
      error
      helperText="Las contraseñas no coinciden"
    />
  </Mui.Box>
);

export const Disabled = () => (
  <Mui.Box sx={{ maxWidth: 400 }}>
    <PasswordInput label="Contraseña" fullWidth disabled defaultValue="contraseña guardada" />
  </Mui.Box>
);
