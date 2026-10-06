import { Visibility, VisibilityOff } from "@mui/icons-material";
import { IconButton, InputAdornment, TextField, type TextFieldProps } from "@mui/material";
import { useState, type FC } from "react";

/**
 * A password field with a show/hide toggle (#196).
 *
 * The value is never trimmed or transformed here, and pasting is never
 * blocked. Because nothing trims it, a mobile keyboard must not edit it
 * either: an auto-capitalised first letter or an auto-corrected word would be
 * sent as typed, fail the login and count towards the throttling limit. So
 * autocorrect, autocapitalize and spellcheck are off in both states -- the
 * revealed one is a text input, which keyboards otherwise feel free to edit.
 *
 * `autoComplete` is the caller's: `current-password` or `new-password`.
 */
export const PasswordInput: FC<TextFieldProps> = ({ slotProps, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const callerInput = typeof slotProps?.input === "object" ? slotProps.input : undefined;
  const callerHtmlInput = typeof slotProps?.htmlInput === "object" ? slotProps.htmlInput : undefined;

  return (
    <TextField
      {...props}
      slotProps={{
        ...slotProps,
        input: {
          ...callerInput,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        },
        htmlInput: {
          ...callerHtmlInput,
          autoCorrect: "off",
          autoCapitalize: "none",
          spellCheck: false,
        },
      }}
      type={showPassword ? "text" : "password"}
    />
  );
};
