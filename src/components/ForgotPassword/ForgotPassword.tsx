import { Box, Button, FormGroup, TextField, Typography } from "@mui/material"
import { useState, type FC } from "react"

export const ForgotPassword: FC = () => {
    const [formError, setFormError] = useState<boolean>(false);
    const invalidIdFormat = 'El DNI/NIF debe tener 7 dígitos y una letra';
    const idErrorMessage = 'Este DNI no se encuentra en nuestra base de datos. Por favor, introdúcelo de nuevo. Si el problema persiste ponte en contacto con nosotres.';

    const isValidIdFormat = (value: string) => /^\d{7}[a-zA-Z]$/.test(value.trim());

    const handleSubmit = async (data: FormData) => {
        const id = data.get('id')?.toString().trim();
        const newError = !id || !isValidIdFormat(id);
        
        setFormError(newError);
        if (newError) return;

    };
return <Box component="form" className="p-7 w-full" action={handleSubmit}>
        <Typography  gutterBottom className="text-xl">¿No recuerdas tu contraseña?</Typography>
        <Typography  gutterBottom className="text-base">Introduce tu DNI y te enviaremos un correo</Typography>
        <FormGroup className="mt-6">
            <TextField                
                error={formError}
                helperText={formError? invalidIdFormat : ''}
                id="id"
                type="text"
                name="id"
                placeholder="Escribe aquí tu DNI/NIF"
                autoFocus
                required
                fullWidth
                variant="filled"
                ></TextField>
                <Button type="submit" variant="contained" fullWidth className="mt-4">Enviar</Button>
        </FormGroup>
    </Box>

}