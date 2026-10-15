import { alpha } from "@mui/material/styles";
import { radii, shadows, colors } from "../../theme/tokens";
import { type FC, type ReactNode } from "react";
import type { Action } from "../../hooks/actions";
import type { CredentialsErrors, CredentialsField } from "../../utils/integrationCredentials";
import type { CredentialsFieldsProps } from "./CredentialsFields";
import { Box, Typography, Paper, Switch, Button, Collapse } from "@mui/material";
import { CredentialsFields } from "./CredentialsFields";
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
  /**
   * The save itself, handed over by whoever may perform it.
   *
   * Required, not optional: the card has no way to render without it, which is
   * what stops it being mounted for a caller the backend would refuse. Its
   * pending flag lives inside it, so there is no separate isSaving prop that
   * could fall out of step with the mutation it describes.
   *
   * It takes no arguments because the page reads the form and words the
   * outcome; this component only decides when the save happens.
   */
  save: Action<[], void>;
  /** This provider's stored configuration is still in flight. */
  isLoading?: boolean;
  /**
   * The field messages to show now. The page decides when a rule speaks; the
   * card only renders what it is given. A provider without rules passes none.
   */
  errors?: CredentialsErrors;
  /** A credentials field lost focus. */
  onFieldBlur?: (field: CredentialsField) => void;
  /** `undefined`: the built-in switch, writing `enabled` through `onChange`. `null`: no control. A node: that control. */
  headerControl?: ReactNode;
  /** What the provider says about its own state, shown under the header. */
  status?: ReactNode;
  /** Each credentials field's input, for a screen that must bring the admin to one. */
  inputRefs?: CredentialsFieldsProps["inputRefs"];
}

const ProviderMark: FC<{ icon: string; color: string }> = ({ icon, color }) => {
  const IconComponent = iconMap[icon] || ExtensionIcon;
  return (
    <Box
      sx={{
        width: 48,
        height: 48,
        borderRadius: radii.default,
        // alpha() rather than appending hex digits: `${color}15` silently
        // breaks for any colour not written as 6-digit hex.
        background: alpha(color, 0.08),
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

export const IntegrationCard: FC<IntegrationCardProps> = ({
  provider,
  accent,
  value,
  onChange,
  save,
  isLoading = false,
  errors = {},
  onFieldBlur,
  headerControl,
  status,
  inputRefs,
}) => {
  const enabled = value.enabled;
  const hasCreds = provider.fields.includes("credentials");
  const isSaving = save.isPending;
  // A blocked save must show why, so its messages open the fields even with
  // the switch off: the backend checks them whether or not it is on (#245).
  const hasErrors = Object.values(errors).some(Boolean);
  const titleId = `integration-${provider.id}-title`;

  return (
    // A named section, so the card is a region labelled by its provider:
    // reachable by role rather than by its MUI class.
    <Paper
      component="section"
      aria-labelledby={titleId}
      elevation={0}
      sx={{
        borderRadius: { xs: radii.default, sm: radii.large },
        bgcolor: "white",
        boxShadow: shadows.soft,
        overflow: "hidden",
        transition: "box-shadow .2s",
        // eslint-disable-next-line no-restricted-syntax -- integration-card hover shadow (0.10 alpha); dataCardHover has 0.15, visual difference matters
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
          {/* eslint-disable-next-line no-restricted-syntax -- near-black provider name (#111827); no matching token */}
          <Typography id={titleId} component="h2" variant="h6" sx={{ color: "#111827" }}>
              {provider.name}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: colors.text.subtle, mt: 0.5 }}>
            {provider.description}
          </Typography>
        </Box>
        {isLoading ? (
          // Occupies the switch's exact footprint so nothing shifts when the
          // real control arrives. Disabled by omission rather than decoration:
          // toggling before the stored config lands would be silently
          // overwritten by the prefill effect the moment it does.
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 58, height: 38 }}>
            <CircularProgress size={20} aria-label={`Cargando configuración de ${provider.name}`} />
          </Box>
        ) : headerControl !== undefined ? (
          headerControl
        ) : (
        <Switch
          checked={enabled}
          onChange={(e) => onChange(provider.id, { enabled: e.target.checked })}
          sx={{
            "& .MuiSwitch-switchBase.Mui-checked": { color: accent },
            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: accent },
          }}
        />
        )}
      </Box>

      {status && <Box sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 } }}>{status}</Box>}

      {/* Body — only for providers with credentials */}
      {hasCreds && (
        <Collapse in={enabled || hasErrors} timeout={250}>
          <Box
            sx={{
              px: { xs: 2, sm: 3 },
              pb: { xs: 2, sm: 3 },
              pt: 0,
              borderTop: `1px dashed ${colors.divider}`,
            }}
          >
            <Box sx={{ pt: { xs: 2, sm: 3 } }}>
              <CredentialsFields
                value={value}
                onChange={(patch) => onChange(provider.id, patch)}
                errors={errors}
                onFieldBlur={onFieldBlur}
                inputRefs={inputRefs}
                accent={accent}
                urlPlaceholder={provider.urlPlaceholder}
              />

              {/* Helper / docs link */}
              {provider.help && (
                <Box
                  sx={{
                    mt: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    color: colors.text.subtle,
                  }}
                >
                  <InfoOutlineIcon sx={{ fontSize: 16, color: colors.text.muted }} />
                  <Typography variant="caption" sx={{ color: colors.text.subtle }}>
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
          disabled={isSaving || isLoading}
          // With field rules, pressing Guardar would first blur the field being
          // edited, and the message that blur reveals pushes this button down
          // before the press ends -- so the click lands outside it and is lost.
          // Keeping focus where it is lets the click through; the save attempt
          // then shows every message at once.
          onMouseDown={onFieldBlur ? (e) => e.preventDefault() : undefined}
          onClick={() => void save.run()}
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
