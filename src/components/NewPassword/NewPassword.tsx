import { Box, Button, FormGroup, TextField, Typography } from "@mui/material"
import type { FC } from "react"

const handleSubmit = (event: React.FormEvent) => {
event.preventDefault();
};

export const NewPassword: FC = () => {
return <Box component="form" className="md:p-7 w-[356px] md:w-full" onSubmit={handleSubmit}>
        <Typography  gutterBottom className="text-base">Introduce tu nueva contraseña</Typography>
        <FormGroup className="md:w-[431px]">
            <TextField                
                // error={emailError}
                // helperText={emailErrorMessage}
                id="id"
                type="id"
                name="newId"
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