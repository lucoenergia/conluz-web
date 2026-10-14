import { useId, useState, type FC } from "react";
import { alpha } from "@mui/material/styles";
import { Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import SolarPowerIcon from "@mui/icons-material/SolarPower";
import { useGetHuaweiConfig } from "../../api/production/production";
import type { ConfigureHuaweiBody } from "../../api/models";
import type { Action, HuaweiWriteResult } from "../../hooks/actions";
import { LoadErrorAlert } from "../../components/LoadErrorAlert/LoadErrorAlert";
import { useSuccessDispatch } from "../../context/success.context";
import { storedPasswordFrom } from "../../utils/integrationCredentials";
import { colors, radii, shadows } from "../../theme/tokens";
import { HuaweiConfigDialog } from "./HuaweiConfigDialog";
import { HUAWEI_ACCENT, isNotFound, type StoredHuaweiConfig } from "./huaweiConfig";

export const NOT_CONFIGURED_TEXT = "Esta planta aún no tiene configurada la integración con Huawei.";
export const LOAD_FAILED_TEXT = "No se pudo cargar la configuración de Huawei.";
export const SAVED_TEXT = "Configuración de Huawei guardada";

export interface HuaweiIntegrationCardProps {
  plantId: string;
  /** The configuration write, handed over only to a caller who may manage the plant. */
  configure: Action<[ConfigureHuaweiBody], HuaweiWriteResult>;
}

/**
 * A 404 is "not configured yet", the normal state of a new plant, so it is
 * answered at once rather than retried like a failure. Anything else keeps
 * the app's default of three attempts.
 */
const retryUnlessNotFound = (failureCount: number, error: unknown) => !isNotFound(error) && failureCount < 3;

const Fact: FC<{ label: string; value: string }> = ({ label, value }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography component="dt" variant="caption" sx={{ color: colors.text.subtle }}>
      {label}
    </Typography>
    <Typography component="dd" variant="body2" sx={{ m: 0, overflowWrap: "anywhere" }}>
      {value}
    </Typography>
  </Box>
);

/** The Huawei integration of one plant: its state, and the way to configure it (#192). */
export const HuaweiIntegrationCard: FC<HuaweiIntegrationCardProps> = ({ plantId, configure }) => {
  const titleId = useId();
  const successDispatch = useSuccessDispatch();
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);

  const { data, error, isLoading, refetch } = useGetHuaweiConfig(plantId, {
    query: { retry: retryUnlessNotFound },
  });
  const stored = data as StoredHuaweiConfig | undefined;
  const notConfigured = !stored && isNotFound(error);
  const passwordSet = storedPasswordFrom(
    stored ? { passwordSet: stored.passwordSet === true } : undefined,
    error,
  );

  return (
    <Paper
      component="section"
      aria-labelledby={titleId}
      elevation={0}
      sx={{
        borderRadius: { xs: radii.default, sm: radii.large },
        bgcolor: "white",
        boxShadow: shadows.soft,
        p: { xs: 2, sm: 3 },
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: radii.default,
            background: alpha(HUAWEI_ACCENT, 0.08),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <SolarPowerIcon sx={{ fontSize: 26, color: HUAWEI_ACCENT }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography id={titleId} component="h3" variant="h6">
            Huawei
          </Typography>
          <Typography variant="body2" sx={{ color: colors.text.subtle }}>
            Datos de producción de esta planta desde sus inversores Huawei.
          </Typography>
        </Box>
      </Box>

      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
          <CircularProgress size={24} aria-label="Cargando configuración de Huawei" />
        </Box>
      )}

      {notConfigured && (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1.5 }}>
          <Typography variant="body2">{NOT_CONFIGURED_TEXT}</Typography>
          <Button variant="contained" onClick={() => setDialog("create")}>
            Configurar
          </Button>
        </Box>
      )}

      {/* Only a failure other than 404 is an error. Nothing is offered but the
          retry: an edit must send the stored `enabled`, which is unknown here. */}
      {!stored && !isLoading && !!error && !notConfigured && (
        <LoadErrorAlert message={LOAD_FAILED_TEXT} onRetry={() => void refetch()} />
      )}

      {stored && (
        <>
          <Box
            component="dl"
            sx={{
              m: 0,
              display: "grid",
              gap: 1.5,
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
            }}
          >
            <Fact label="Usuario" value={stored.username || "—"} />
            <Fact label="URL del servicio" value={stored.baseUrl || "—"} />
            <Fact label="Contraseña" value={passwordSet ? "Guardada" : "Sin guardar"} />
          </Box>
          <Box>
            <Button variant="outlined" onClick={() => setDialog("edit")}>
              Editar
            </Button>
          </Box>
        </>
      )}

      {dialog && (
        <HuaweiConfigDialog
          mode={dialog}
          stored={stored}
          passwordSet={passwordSet}
          configure={configure}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            successDispatch(SAVED_TEXT);
          }}
        />
      )}
    </Paper>
  );
};
