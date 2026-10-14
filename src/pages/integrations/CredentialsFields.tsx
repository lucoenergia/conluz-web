import { useState, type FC } from "react";
import { Box, TextField, InputAdornment, IconButton } from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LockOutlineIcon from "@mui/icons-material/LockOutline";
import LinkIcon from "@mui/icons-material/Link";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { colors } from "../../theme/tokens";
import type { CredentialsErrors, CredentialsField } from "../../utils/integrationCredentials";

export const PASSWORD_KEPT_HELPER = "Contraseña configurada. Déjala vacía para mantenerla.";

export interface CredentialsFieldsValue {
  username?: string;
  password?: string;
  baseUrl?: string;
  /** A password is stored, so an empty field keeps it. */
  passwordSet?: boolean;
}

interface CredentialsFieldsProps {
  value: CredentialsFieldsValue;
  onChange: (patch: Partial<Record<CredentialsField, string>>) => void;
  /** The field messages to show now. The owner decides when a rule speaks. */
  errors?: CredentialsErrors;
  /** A field lost focus. */
  onFieldBlur?: (field: CredentialsField) => void;
  accent: string;
  urlPlaceholder?: string;
}

const fieldSx = (accent: string) => ({
  "& .MuiOutlinedInput-root": {
    "&:hover fieldset": { borderColor: accent },
    "&.Mui-focused fieldset": { borderColor: accent },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: accent },
});

/**
 * Usuario, Contraseña and URL del servicio: the credentials every
 * user/password/URL integration asks for. Shared by the community integration
 * cards and the plant's Huawei form (#192), so both follow the same password
 * and field rules (UI-INT-001…004).
 */
export const CredentialsFields: FC<CredentialsFieldsProps> = ({
  value,
  onChange,
  errors = {},
  onFieldBlur,
  accent,
  urlPlaceholder,
}) => {
  const [showPwd, setShowPwd] = useState(false);

  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
      }}
    >
      <TextField
        label="Usuario"
        value={value.username || ""}
        onChange={(e) => onChange({ username: e.target.value })}
        onBlur={() => onFieldBlur?.("username")}
        error={!!errors.username}
        helperText={errors.username}
        fullWidth
        variant="outlined"
        size="small"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <PersonOutlineIcon sx={{ fontSize: 20, color: colors.text.muted }} />
            </InputAdornment>
          ),
        }}
        sx={fieldSx(accent)}
      />
      <TextField
        label="Contraseña"
        type={showPwd ? "text" : "password"}
        value={value.password || ""}
        onChange={(e) => onChange({ password: e.target.value })}
        onBlur={() => onFieldBlur?.("password")}
        error={!!errors.password}
        // Visible text, not a tooltip: most admins are on a phone.
        helperText={errors.password ?? (value.passwordSet ? PASSWORD_KEPT_HELPER : undefined)}
        fullWidth
        variant="outlined"
        size="small"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LockOutlineIcon sx={{ fontSize: 20, color: colors.text.muted }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                size="small"
                aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowPwd((v) => !v)}
                edge="end"
              >
                {showPwd ? (
                  <VisibilityOffIcon sx={{ fontSize: 20, color: colors.text.muted }} />
                ) : (
                  <VisibilityIcon sx={{ fontSize: 20, color: colors.text.muted }} />
                )}
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={fieldSx(accent)}
      />
      <TextField
        label="URL del servicio"
        placeholder={urlPlaceholder}
        value={value.baseUrl || ""}
        onChange={(e) => onChange({ baseUrl: e.target.value })}
        onBlur={() => onFieldBlur?.("baseUrl")}
        error={!!errors.baseUrl}
        helperText={errors.baseUrl}
        fullWidth
        variant="outlined"
        size="small"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LinkIcon sx={{ fontSize: 20, color: colors.text.muted }} />
            </InputAdornment>
          ),
        }}
        sx={{ ...fieldSx(accent), gridColumn: { xs: "auto", sm: "1 / -1" } }}
      />
    </Box>
  );
};
