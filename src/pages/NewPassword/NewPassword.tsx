import { Box, Button, FormGroup, Typography } from "@mui/material"
import { useState, type FC } from "react"
import { PasswordInput } from "../../components/forms/PasswordInput";


export const NewPassword: FC = () => {
  const [formErrors, setFormErrors] = useState<{
    newPassword: boolean,
    repeatNewPassword: boolean,
    differentPasswords: boolean
  }>({
    newPassword: false,
    repeatNewPassword: false,
    differentPasswords: false
  });


  const differentPasswordMessage = 'La contraseña no coincide';
  const passwordReminder = 'Por favor, repite tu contraseña';
  const newPasswordMessage = 'Introduce tu nueva contraseña';


  const handleSubmit = async (data: FormData) => {
    const newPassword = data.get('newPassword')?.toString().trim();
    const repeatNewPassword = data.get('repeatNewPassword')?.toString().trim();
    const newErrors = {
      newPassword: !newPassword,
      repeatNewPassword: !repeatNewPassword,
      differentPasswords: repeatNewPassword !== newPassword
    }

    setFormErrors(newErrors);

    if (newErrors.newPassword || newErrors.repeatNewPassword || newErrors.differentPasswords) return;


  };
  return <Box component="form" className="p-7 w-full" action={handleSubmit}>
    <Typography gutterBottom className="text-base">Introduce tu nueva contraseña</Typography>
    <FormGroup >
      <PasswordInput
        error={formErrors.newPassword}
        helperText={formErrors.newPassword ? newPasswordMessage : ''}
        id="newPassword"
        type="password"
        name="newPassword"
        className="mt-4"
        placeholder="Escribe aquí tu nueva contraseña"
        autoFocus
        required
        fullWidth
        variant="filled"
      // color={emailError ? 'error' : 'primary'}
      />
      <PasswordInput
        error={formErrors.repeatNewPassword || formErrors.differentPasswords}
        helperText={formErrors.differentPasswords ? differentPasswordMessage : passwordReminder}
        id="repeatNewPassword"
        type="password"
        name="repeatNewPassword"
        className="mt-4"
        placeholder="Repite aquí tu nueva contraseña"
        autoFocus
        required
        fullWidth
        variant="filled"
      // color={emailError ? 'error' : 'primary'}
      />
      <Button type="submit" variant="contained" fullWidth className="mt-4">Enviar</Button>
    </FormGroup>
  </Box>

}
