import type { FC } from "react"
import { Box, Button, Checkbox, FormControlLabel, FormGroup,InputLabel,Link,TextField, Typography } from "@mui/material"
import { LabeledIcon } from "../labeled-icon/LabeledIcon";
import WavingHandOutlinedIcon from '@mui/icons-material/WavingHandOutlined';
import { Link as RouterLink } from 'react-router'

export const Login: FC = () => {
  const label = 'Bienvenide a ConLuz';
  const passwordErrorMessage = 'Por favor, introduce tu contraseña'
  const idErrorMessage = 'Por favor, introduce tu DNI/NIF'


  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
  };
return <Box component="form" className="p-7 w-full" onSubmit={handleSubmit}>
      <LabeledIcon label={label} icon={WavingHandOutlinedIcon} iconPosition="right" justify="start" variant="compact" labelSize="text-xl"></LabeledIcon>
      <Typography variant="subtitle2" gutterBottom>
        Por favor, accede a tu cuenta introduciendo tu DNI/NIF y contraseña
      </Typography>
        <FormGroup>
            <InputLabel className="mt-10">DNI/NIF</InputLabel>
            <TextField
                // error={dniNifError}
                helperText={idErrorMessage}
                id="id"
                type="text"
                name="id"
                placeholder="Escribe aquí tu DNI/NIF"
                autoFocus
                required
                fullWidth
                variant="filled"
                // color={dniNifError ? 'error' : 'primary'}
            />
            <InputLabel className="mt-4">Contraseña</InputLabel>
            <TextField
                // error={passwordError}
                helperText={passwordErrorMessage}
                id="password"
                type="password"
                name="password"
                placeholder="Escribe aquí tu contraseña"
                autoComplete="password"
                autoFocus
                required
                fullWidth
                variant="filled"
                // color={passwordError ? 'error' : 'primary'}
                // color="primary"
            />
            <Box className="flex flex-row justify-between items-center w-full">
              <FormControlLabel control={<Checkbox color="success"/>} label="Recordarme" className="mt-2"/>
              <Link component={RouterLink} to='/forgotpassword' underline="always" color="info">
                  {'¿Olvidaste tu contraseña?'}
              </Link>
            </Box>
            <Button type="submit" variant="contained" fullWidth className="mt-4">
                Entrar
            </Button>
            <Typography className="mt-7">¿No puedes acceder a la plataforma?</Typography>
            <Link component={RouterLink} to='/contact' underline="always" color="info">{'Contacta con nosotres'}</Link>
        </FormGroup>
    </Box>
}