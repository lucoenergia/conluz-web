import { Box, Button, FormGroup, Typography } from "@mui/material";
import { useMemo, useState, type FC } from "react";
import { PasswordInput } from "../../components/Forms/PasswordInput";

export const NewPassword: FC = () => {
  const [password, setPassword] = useState<string | null>(null);
  const [repeatPassword, setRepeatPassword] = useState<string | null>(null);

  const differentPasswordMessage = "Las contraseñas no coinciden";
  const passwordReminder = "Por favor, repite tu contraseña";
  const newPasswordMessage = "Introduce tu nueva contraseña";

  const formErrors = useMemo(() => {
    return {
      newPassword: password === "",
      repeatNewPassword: repeatPassword === "",
      differentPasswords: password !== repeatPassword,
    };
  }, [password, repeatPassword]);

  const handleSubmit = async (_data: FormData) => {
    // const newPassword = data.get('newPassword')?.toString().trim();
    // const repeatNewPassword = data.get('repeatNewPassword')?.toString().trim();

    if (formErrors.newPassword || formErrors.repeatNewPassword || formErrors.differentPasswords) return; //TODO: Add backend call when method exists
  };

  return (
    <Box component="form" sx={{ p: 7, width: "100%" }} action={handleSubmit}>
      <Typography gutterBottom>
        Introduce tu nueva contraseña
      </Typography>
      <FormGroup>
        <PasswordInput
          error={formErrors.newPassword}
          helperText={formErrors.newPassword ? newPasswordMessage : ""}
          id="newPassword"
          type="password"
          name="newPassword"
          sx={{ mt: 4 }}
          placeholder="Escribe aquí tu nueva contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          required
          fullWidth
          variant="filled"
        />
        <PasswordInput
          error={formErrors.repeatNewPassword || formErrors.differentPasswords}
          helperText={formErrors.differentPasswords ? differentPasswordMessage : passwordReminder}
          id="repeatNewPassword"
          type="password"
          name="repeatNewPassword"
          sx={{ mt: 4 }}
          placeholder="Repite aquí tu nueva contraseña"
          value={repeatPassword}
          onChange={(e) => setRepeatPassword(e.target.value)}
          autoFocus
          required
          fullWidth
          variant="filled"
        />
        <Button
          type="submit"
          variant="contained"
          fullWidth
          sx={{ mt: 4 }}
          disabled={formErrors.newPassword || formErrors.repeatNewPassword || formErrors.differentPasswords}
        >
          Enviar
        </Button>
      </FormGroup>
    </Box>
  );
};
