import { PasswordPolicyHint, PasswordInput, Mui } from "conluz-web";

export const Default = () => (
  <Mui.Box sx={{ maxWidth: 440 }}>
    <PasswordPolicyHint id="policy-hint" />
  </Mui.Box>
);

export const UnderNewPasswordField = () => (
  <Mui.Box sx={{ maxWidth: 440 }}>
    <PasswordInput
      label="Nueva contraseña"
      fullWidth
      autoComplete="new-password"
      defaultValue=""
      slotProps={{ htmlInput: { "aria-describedby": "policy-hint-2" } }}
    />
    <PasswordPolicyHint id="policy-hint-2" />
  </Mui.Box>
);
