import { Box, Button, FormGroup, TextField, Typography } from "@mui/material"
import type { FC } from "react"

const handleSubmit = (event: React.FormEvent) => {
event.preventDefault();
};
// const idErrorMessage = 'Por favor, introduce tu DNI/NIF'

export const ForgotPassword: FC = () => {
return <Box component="form" className="md:p-7" onSubmit={handleSubmit}>
        <Typography  gutterBottom className="text-xl text-center md:text-left">¿No recuerdas tu contraseña?</Typography>
        <Typography  gutterBottom className="text-base">Introduce tu DNI y te enviaremos un correo</Typography>
        <FormGroup className="md:w-[431px]  mt-6">
            <TextField                // error={emailError}
                // helperText={idErrorMessage}
                id="id"
                type="id"
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