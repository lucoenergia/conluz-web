import { Box, Button, FormGroup, TextField, Typography } from "@mui/material"
import type { FC } from "react"

const handleSubmit = (event: React.FormEvent) => {
event.preventDefault();
};
// const idErrorMessage = 'Por favor, introduce tu DNI/NIF'

export const ForgotPassword: FC = () => {
return <Box component="form" className="p-7 w-full" onSubmit={handleSubmit}>
        <Typography  gutterBottom className="text-xl">¿No recuerdas tu contraseña?</Typography>
        <Typography  gutterBottom className="text-base">Introduce tu DNI y te enviaremos un correo</Typography>
        <FormGroup className="mt-6">
            <TextField                // error={emailError}
                // helperText={idErrorMessage}
                id="id"
                type="text"
                name="id"
                placeholder="Escribe aquí tu DNI/NIF"
                autoFocus
                required
                fullWidth
                variant="filled"
                // color={emailError ? 'error' : 'primary'}
                ></TextField>
                <Button type="submit" variant="contained" fullWidth className="mt-4">Enviar</Button>
        </FormGroup>
    </Box>

}