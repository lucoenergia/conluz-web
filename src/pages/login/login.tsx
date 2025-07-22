import { useState, type FC } from "react"
import { Box, Button, Checkbox, FormControlLabel, FormGroup,InputLabel,Link,TextField, Typography } from "@mui/material"
import WavingHandOutlinedIcon from '@mui/icons-material/WavingHandOutlined';
import { Link as RouterLink, useNavigate } from 'react-router'
import { login } from "../../api/authentication/authentication";
import { useAuthDispatch } from "../../api/auth.context";
import { LabeledIcon } from "../../components/labeled-icon/LabeledIcon";

export const Login: FC = () => {
  const [loginError, setLoginError] = useState(false);
  const [formErrors, setFormErrors] = useState<{ id: boolean; password: boolean }>({
    id: false,
    password: false,
  });

  const label = 'Bienvenide a ConLuz';
  const passwordErrorMessage = 'Por favor, introduce tu contraseña'
  const idErrorMessage = 'Por favor, introduce tu DNI/NIF'
  const dispatchAuth = useAuthDispatch();
  const navigate = useNavigate();

  const validateInput = (username?: string, password?: string): boolean => {
    const newErrors = {
      id: !username,
      password: !password,
    };
    
    setFormErrors(newErrors);

    return !newErrors.id && !newErrors.password;
  }
  
  const handleSubmit = async (data: FormData) => {
    const id = data.get('id')?.toString().trim();
    const password = data.get('password')?.toString().trim();
    
    if (!validateInput(id,password)) return;

    try {
      const response = await login({username: data.get('id'), password: data.get('password')});
      if (response && response.token) {
        setLoginError(false); 
        dispatchAuth(response.token);
        navigate('/');    
      } else {
        setLoginError(true); 
      }
    } catch(error) {
      setLoginError(true); 
      console.log(error)
    }
  };
return <Box component="form" className="p-7 w-full" action={handleSubmit}>
      <LabeledIcon label={label} icon={WavingHandOutlinedIcon} iconPosition="right" justify="start" variant="compact" labelSize="text-xl"></LabeledIcon>
      <Typography variant="subtitle2" gutterBottom>
        Por favor, accede a tu cuenta introduciendo tu DNI/NIF y contraseña
      </Typography>
      {loginError && (
        <Typography color="error">
          DNI/NIF o contraseña incorrectos
        </Typography>
      )}        
      <FormGroup>
            <InputLabel className="mt-10">DNI/NIF</InputLabel>
            <TextField
                error={formErrors.id}
                helperText={formErrors.id ? idErrorMessage : ''}
                id="id"
                type="text"
                name="id"
                placeholder="Escribe aquí tu DNI/NIF"
                autoFocus
                required
                fullWidth
                variant="filled"
            />
            <InputLabel className="mt-4">Contraseña</InputLabel>
            <TextField
                error={formErrors.password}
                helperText={formErrors.password ? passwordErrorMessage : ''}
                id="password"
                type="password"
                name="password"
                placeholder="Escribe aquí tu contraseña"
                autoComplete="password"
                autoFocus
                required
                fullWidth
                variant="filled"
            />
            <Box className="flex flex-row justify-between items-center w-full">
              <FormControlLabel control={<Checkbox color="success"/>} label="Recordarme" className="mt-2"/>
              <Link component={RouterLink} to='/forgot-password' underline="always" color="info">
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
