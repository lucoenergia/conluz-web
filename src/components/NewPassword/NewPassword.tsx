import { Box, Button, FormGroup, TextField, Typography } from "@mui/material"
import type { FC } from "react"

const handleSubmit = (event: React.FormEvent) => {
event.preventDefault();
};

export const NewPassword: FC = () => {
return <Box component="form" className="p-7 w-full" onSubmit={handleSubmit}>
        <Typography  gutterBottom className="text-base">Introduce tu nueva contraseña</Typography>
        <FormGroup >
            <TextField                
                // error={emailError}
                // helperText={emailErrorMessage}
                id="newPassword"
                type="password"
                name="newPassword"
                placeholder="Escribe aquí tu nueva contraseña"
                autoFocus
                required
                fullWidth
                variant="filled"
                // color={emailError ? 'error' : 'primary'}
                ></TextField>
                        <TextField                
                // error={emailError}
                // helperText={emailErrorMessage}
                id="repeatNewPassword"
                type="password"
                name="repeatNewPassword"
                placeholder="Escribe aquí tu nueva contraseña"
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