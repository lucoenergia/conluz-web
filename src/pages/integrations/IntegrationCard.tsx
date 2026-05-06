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
  Chip,
} from "@mui/material";
import { CircularProgress } from "@mui/material";
import ElectricMeterIcon from "@mui/icons-material/ElectricMeter";
import SolarPowerIcon from "@mui/icons-material/SolarPower";
import SensorsIcon from "@mui/icons-material/Sensors";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LockOutlineIcon from "@mui/icons-material/LockOpen";
import LinkIcon from "@mui/icons-material/Link";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import InfoOutlineIcon from "@mui/icons-material/InfoOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import DoNotDisturbOnIcon from "@mui/icons-material/DoNotDisturbOn";
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
  check_circle: CheckCircleIcon,
  cancel: CancelIcon,
  help_outline: HelpOutlineIcon,
  do_not_disturb_on: DoNotDisturbOnIcon,
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
  };
  onChange: (id: string, patch: Record<string, unknown>) => void;
  onSave: (id: string) => void;
  isSaving: boolean;
}

const statusMap: Record<string, { bg: string; fg: string; icon: string; label: string }> = {
  connected: { bg: "#dcfce7", fg: "#166534", icon: "check_circle", label: "Conectado" },
  disconnected: { bg: "#fee2e2", fg: "#991b1b", icon: "cancel", label: "Desconectado" },
  unconfigured: { bg: "#f1f5f9", fg: "#475569", icon: "help_outline", label: "Sin configurar" },
  disabled: { bg: "#f1f5f9", fg: "#64748b", icon: "do_not_disturb_on", label: "Deshabilitado" },
};

const StatusChip: FC<{ status: string }> = ({ status }) => {
  const s = statusMap[status];
  const IconComponent = iconMap[s.icon] || ExtensionIcon;
  return (
    <Chip
      icon={<IconComponent sx={{ fontSize: 16, color: s.fg }} />}
      label={s.label}
      sx={{
        bgcolor: s.bg,
        color: s.fg,
        fontWeight: 600,
        fontSize: "0.75rem",
        height: 26,
        borderRadius: "13px",
        "& .MuiChip-label": { px: 2 },
        "& .MuiChip-icon": { color: s.fg, ml: "8px" },
      }}
    />
  );
};

const ProviderMark: FC<{ icon: string; color: string }> = ({ icon, color }) => {
  const IconComponent = iconMap[icon] || ExtensionIcon;
  return (
    <Box
      sx={{
        width: 48,
        height: 48,
        borderRadius: 2,
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

  const status = !enabled
    ? "disabled"
    : hasCreds
    ? value.username && value.password
      ? "connected"
      : "unconfigured"
    : "connected";

  const handleSave = () => {
    onSave(provider.id);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: { xs: 2, sm: 3 },
        bgcolor: "white",
        boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
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
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#111827" }}>
              {provider.name}
            </Typography>
            <StatusChip status={status} />
          </Box>
          <Typography variant="body2" sx={{ color: "#6b7280", mt: 0.5 }}>
            {provider.description}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            alignSelf: { xs: "flex-end", sm: "center" },
          }}
        >
          <Typography variant="body2" sx={{ color: "#6b7280", fontWeight: 500 }}>
            {enabled ? "Habilitado" : "Deshabilitado"}
          </Typography>
          <Switch
            checked={enabled}
            onChange={(e) => onChange(provider.id, { enabled: e.target.checked })}
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked": { color: accent },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: accent },
            }}
          />
        </Box>
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

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 1.5,
                  mt: 2.5,
                  flexWrap: "wrap",
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
                    borderRadius: "6px",
                    px: 3,
                    boxShadow: "0 2px 4px 0 rgba(0,0,0,0.12)",
                    "&:hover": {
                      background: accent,
                      filter: "brightness(0.95)",
                      boxShadow: "0 4px 8px 0 rgba(0,0,0,0.16)",
                    },
                  }}
                >
                  {isSaving ? "Guardando..." : "Guardar"}
                </Button>
              </Box>
            </Box>
          </Box>
        </Collapse>
      )}

      {/* Shelly: no credentials, just a thin save row when toggled */}
      {!hasCreds && (
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
              borderRadius: "6px",
              px: 3,
              boxShadow: "0 2px 4px 0 rgba(0,0,0,0.12)",
              "&:hover": {
                background: accent,
                filter: "brightness(0.95)",
              },
            }}
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        </Box>
      )}
    </Paper>
  );
};
