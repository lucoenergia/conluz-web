import { radii, shadows } from "../../theme/tokens";
import { useState, type FC } from "react";
import {
  Box,
  Typography,
  Paper,
  Switch,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Collapse,
} from "@mui/material";
import { CircularProgress } from "@mui/material";
import ElectricMeterIcon from "@mui/icons-material/ElectricMeter";
import SolarPowerIcon from "@mui/icons-material/SolarPower";
import SensorsIcon from "@mui/icons-material/Sensors";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LockOutlineIcon from "@mui/icons-material/LockOutline";
import LinkIcon from "@mui/icons-material/Link";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import InfoOutlineIcon from "@mui/icons-material/InfoOutlined";
import BoltIcon from "@mui/icons-material/Bolt";
import SaveIcon from "@mui/icons-material/Save";
import ExtensionIcon from "@mui/icons-material/Extension";

const iconMap: Record<string, React.ComponentType<{ sx?: Record<string, unknown> }>> = {
  electric_meter: ElectricMeterIcon,
  solar_power: SolarPowerIcon,
  sensors: SensorsIcon,
  person_outline: PersonOutlineIcon,
  lock_outline: LockOutlineIcon,
  link: LinkIcon,
  visibility: VisibilityIcon,
  visibility_off: VisibilityOffIcon,
  info_outline: InfoOutlineIcon,
  bolt: BoltIcon,
  save: SaveIcon,
  extension: ExtensionIcon,
};

interface Provider {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  fields: string[];
  urlPlaceholder?: string;
  help?: string;
}

interface IntegrationCardProps {
  provider: Provider;
  accent: string;
  value: {
    enabled: boolean;
    username?: string;
    password?: string;
    baseUrl?: string;
    passwordSet?: boolean;
  };
  onChange: (id: string, patch: Record<string, unknown>) => void;
  onSave: (id: string) => void;
  isSaving: boolean;
}

const ProviderMark: FC<{ icon: string; color: string }> = ({ icon, color }) => {
  const IconComponent = iconMap[icon] || ExtensionIcon;
  return (
    <Box
      sx={{
        width: 48,
        height: 48,
        borderRadius: radii.default,
        background: `${color}15`,
        color: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <IconComponent sx={{ fontSize: 26, color }} />
    </Box>
  );
};

const fieldSx = (accent: string) => ({
  "& .MuiOutlinedInput-root": {
    "&:hover fieldset": { borderColor: accent },
    "&.Mui-focused fieldset": { borderColor: accent },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: accent },
});

export const IntegrationCard: FC<IntegrationCardProps> = ({
  provider,
  accent,
  value,
  onChange,
  onSave,
  isSaving,
}) => {
  const [showPwd, setShowPwd] = useState(false);

  const enabled = value.enabled;
  const hasCreds = provider.fields.includes("credentials");

  const handleSave = () => {
    onSave(provider.id);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: { xs: radii.default, sm: radii.large },
        bgcolor: "white",
        boxShadow: shadows.soft,
        overflow: "hidden",
        transition: "box-shadow .2s",
        "&:hover": { boxShadow: "0 6px 24px 0 rgba(0,0,0,0.10)" },
      }}
    >
      {/* Header row */}
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          p: { xs: 2, sm: 3 },
          flexDirection: { xs: "column", sm: "row" },
        }}
      >
        <ProviderMark icon={provider.icon} color={provider.color} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <Typography variant="h6" sx={{ color: "#111827" }}>
              {provider.name}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: "#6b7280", mt: 0.5 }}>
            {provider.description}
          </Typography>
        </Box>
        <Switch
          checked={enabled}
          onChange={(e) => onChange(provider.id, { enabled: e.target.checked })}
          sx={{
            "& .MuiSwitch-switchBase.Mui-checked": { color: accent },
            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: accent },
          }}
        />
      </Box>

      {/* Body — only for providers with credentials */}
      {hasCreds && (
        <Collapse in={enabled} timeout={250}>
          <Box
            sx={{
              px: { xs: 2, sm: 3 },
              pb: { xs: 2, sm: 3 },
              pt: 0,
              borderTop: "1px dashed #e5e7eb",
            }}
          >
            <Box sx={{ pt: { xs: 2, sm: 3 } }}>
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
                  onChange={(e) => onChange(provider.id, { username: e.target.value })}
                  fullWidth
                  variant="outlined"
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlineIcon sx={{ fontSize: 20, color: "#9ca3af" }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={fieldSx(accent)}
                />
                <TextField
                  label="Contraseña"
                  type={showPwd ? "text" : "password"}
                  value={value.password || ""}
                  onChange={(e) => onChange(provider.id, { password: e.target.value })}
                  fullWidth
                  variant="outlined"
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlineIcon sx={{ fontSize: 20, color: "#9ca3af" }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowPwd((v) => !v)}
                          edge="end"
                        >
                          {showPwd ? (
                            <VisibilityOffIcon sx={{ fontSize: 20, color: "#9ca3af" }} />
                          ) : (
                            <VisibilityIcon sx={{ fontSize: 20, color: "#9ca3af" }} />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={fieldSx(accent)}
                />
                {value.passwordSet && !value.password && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: -1 }}>
                    <LockOutlineIcon sx={{ fontSize: 16, color: "#10b981" }} />
                    <Typography variant="caption" sx={{ color: "#10b981" }}>
                      Contraseña configurada (deja vacío para mantener)
                    </Typography>
                  </Box>
                )}
                <TextField
                  label="URL del servicio"
                  placeholder={provider.urlPlaceholder}
                  value={value.baseUrl || ""}
                  onChange={(e) => onChange(provider.id, { baseUrl: e.target.value })}
                  fullWidth
                  variant="outlined"
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LinkIcon sx={{ fontSize: 20, color: "#9ca3af" }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ ...fieldSx(accent), gridColumn: { xs: "auto", sm: "1 / -1" } }}
                />
              </Box>

              {/* Helper / docs link */}
              {provider.help && (
                <Box
                  sx={{
                    mt: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    color: "#6b7280",
                  }}
                >
                  <InfoOutlineIcon sx={{ fontSize: 16, color: "#9ca3af" }} />
                  <Typography variant="caption" sx={{ color: "#6b7280" }}>
                    {provider.help}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Collapse>
      )}

      {/* Save button always visible for all integrations */}
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 3 },
          pt: 0,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Button
          variant="contained"
          disabled={isSaving}
          onClick={handleSave}
          startIcon={
            isSaving ? (
              <CircularProgress size={16} sx={{ color: "white" }} />
            ) : (
              <SaveIcon sx={{ fontSize: 18 }} />
            )
          }
          sx={{
            background: accent,
            borderRadius: radii.default,
            px: 3,
            boxShadow: shadows.medium,
            "&:hover": {
              background: accent,
              filter: "brightness(0.95)",
              boxShadow: shadows.strong,
            },
          }}
        >
          {isSaving ? "Guardando..." : "Guardar"}
        </Button>
      </Box>

      {/* Save button always visible for all integrations */}
    </Paper>
  );
};
