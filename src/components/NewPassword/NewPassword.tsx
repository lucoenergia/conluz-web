import { Box, Button, FormGroup, TextField, Typography } from "@mui/material"
import { useState, type FC } from "react"


export const NewPassword: FC = () => {
    const [formErrors, setFormErrors] = useState<{
        password1: boolean, 
        password2: boolean, 
        differentPasswords: boolean}>({
            password1: false, 
            password2: false, 
            differentPasswords: false});

    
    const differentPasswordMessage = 'La contraseña no coincide';
    const passwordReminder = 'Por favor, repite tu contraseña';
    const newPasswordMessage = 'Introduce tu nueva contraseña';


    const handleSubmit = async (data: FormData) => {
        const password1 = data.get('newPassword')?.toString().trim();
        const password2 = data.get('repeatNewPassword')?.toString().trim();
        const newErrors = {
            password1 : !password1,
            password2 : !password2,
            differentPasswords : password2 !== password1 
        }
        setFormErrors(newErrors);
        if (newErrors.password1 || newErrors.password2 || newErrors.differentPasswords ) return;

    };
return <Box component="form" className="p-7 w-full" action={handleSubmit}>
        <Typography  gutterBottom className="text-base">Introduce tu nueva contraseña</Typography>
        <FormGroup >
            <TextField                
                error={formErrors.password1}
                helperText={formErrors.password1 ? newPasswordMessage : ''}
                id="newPassword"
                type="password"
                name="newPassword"
                placeholder="Escribe aquí tu nueva contraseña"
                autoFocus
                required
                fullWidth
                variant="filled"
                // color={emailError ? 'error' : 'primary'}
                />
                <TextField                
                error={formErrors.password2 || formErrors.differentPasswords}
                helperText={formErrors.differentPasswords ? differentPasswordMessage : passwordReminder}
                id="repeatNewPassword"
                type="password"
                name="repeatNewPassword"
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