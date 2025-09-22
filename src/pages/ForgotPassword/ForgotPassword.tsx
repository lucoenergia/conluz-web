import { Box, Button, FormGroup, Link, TextField, Typography } from "@mui/material";
import { useState, type FC } from "react";
import LockIcon from "@mui/icons-material/Lock";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { Link as RouterLink } from "react-router";
import { LabeledIcon } from "../../components/labeled-icon/LabeledIcon";

export const ForgotPassword: FC = () => {
  const [formError, setFormError] = useState<boolean>(false);
  const missingEmail = "El DNI/NIF debe tener 7 dígitos y una letra";
  // const emailErrorMessage = 'Este email no se encuentra en nuestra base de datos. Por favor, introdúcelo de nuevo. Si el problema persiste ponte en contacto con nosotres.';

  const handleSubmit = async (data: FormData) => {
    const id = data.get("email")?.toString().trim();
    const newError = !id;

    setFormError(newError);
    if (newError) return;
    // TODO: Add backend call when method exists
  };
  return (
    <>
      <Box component="form" className="p-7 w-full" action={handleSubmit}>
        <LabeledIcon
          label={"¿Olvidaste tu contraseña?"}
          icon={LockIcon}
          iconPosition="right"
          justify="start"
          variant="compact"
          labelSize="text-xl"
        />
        <Typography gutterBottom className="text-base">
          Introduce tu email y te enviaremos instrucciones para restaurar tu contraseña
        </Typography>
        <FormGroup className="mt-6">
          <TextField
            error={formError}
            helperText={formError ? missingEmail : ""}
            id="email"
            type="email"
            name="email"
            placeholder="Escribe aquí tu email"
            autoFocus
            required
            fullWidth
            variant="filled"
          />
          <Button type="submit" variant="contained" fullWidth className="mt-4">
            Enviar
          </Button>
        </FormGroup>
      </Box>
      <Link to="/login" underline="always" color="info" component={RouterLink}>
        <LabeledIcon label="Volver al inicio" icon={ChevronLeftIcon} iconPosition="left" />
      </Link>
    </>
  );
};
