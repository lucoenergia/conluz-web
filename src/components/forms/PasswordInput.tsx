import { Visibility, VisibilityOff } from "@mui/icons-material";
import { IconButton, InputAdornment, TextField, type TextFieldProps } from "@mui/material";
import { useState, type FC } from "react";

export const PasswordInput: FC<TextFieldProps> = (props) => {
  const [showPassword, setShowPassword] = useState(false);
  return <TextField
    {...props}
    slotProps={{
      input: {
        endAdornment: (
          <InputAdornment position="end" >
            <IconButton
              aria-label={
                showPassword ? 'hide the password' : 'display the password'
              }
              onClick={() => setShowPassword(!showPassword)}
              edge="end"
            >
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment >)
      }

    }
    }
    type={showPassword ? 'text' : 'password'}
  />
}
