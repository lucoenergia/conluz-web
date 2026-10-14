import { useId, useState, type FC } from "react";
import { alpha } from "@mui/material/styles";
import { Alert, Box, Button, CircularProgress, Paper, Switch, Typography } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import SolarPowerIcon from "@mui/icons-material/SolarPower";
import { getGetHuaweiConfigQueryKey, useGetHuaweiConfig } from "../../api/production/production";
import type { ConfigureHuaweiBody } from "../../api/models";
import type { Action, HuaweiWriteResult } from "../../hooks/actions";
import { LoadErrorAlert } from "../../components/LoadErrorAlert/LoadErrorAlert";
import { ConfirmationModal } from "../../components/Modals/ConfirmationModal";
import { useErrorDispatch } from "../../context/error.context";
import { useSuccessDispatch } from "../../context/success.context";
import { useIntegrationToggle } from "../../hooks/useIntegrationToggle";
import { storedPasswordFrom } from "../../utils/integrationCredentials";
import { colors, radii, shadows } from "../../theme/tokens";
import { HuaweiConfigDialog } from "./HuaweiConfigDialog";
import {
  DISABLED_TEXT,
  HUAWEI_ACCENT,
  LOAD_FAILED_TEXT,
  NOT_CONFIGURED_TEXT,
  SAVED_TEXT,
  TOGGLE_FAILED_TEXT,
  incompleteText,
  isNotFound,
  type StoredHuaweiConfig,
} from "./huaweiConfig";

export interface HuaweiIntegrationCardProps {
  plantId: string;
  /** The configuration write, handed over only to a caller who may manage the plant. */
  configure: Action<[ConfigureHuaweiBody], HuaweiWriteResult>;
  /** The enable and disable writes; both are handed over to a caller who may do either. */
  enable: Action<[], HuaweiWriteResult>;
  disable: Action<[], HuaweiWriteResult>;
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
export const HuaweiIntegrationCard: FC<HuaweiIntegrationCardProps> = ({ plantId, configure, enable, disable }) => {
  const titleId = useId();
  const queryClient = useQueryClient();
  const successDispatch = useSuccessDispatch();
  const errorDispatch = useErrorDispatch();
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
  const enabled = stored?.enabled === true;

  const toggle = useIntegrationToggle({
    enabled,
    enable,
    disable,
    incompleteCode: "HUAWEI_CONFIG_INCOMPLETE",
    notFoundCode: "HUAWEI_CONFIG_NOT_FOUND",
    // Reset, not refetch: a refetch that fails keeps the stale configuration
    // on screen, and the point is to show that there is none any more.
    onNotFound: () => void queryClient.resetQueries({ queryKey: getGetHuaweiConfigQueryKey(plantId) }),
    onError: () => errorDispatch(TOGGLE_FAILED_TEXT),
  });

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
        {/* Only once configured: there is nothing to turn on before (UI-INT-007). */}
        {stored && (
          <Switch
            checked={enabled}
            disabled={toggle.isPending}
            onChange={(e) => toggle.request(e.target.checked)}
            slotProps={{ input: { "aria-label": "Integración con Huawei activa" } }}
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked": { color: HUAWEI_ACCENT },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: HUAWEI_ACCENT },
            }}
          />
        )}
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
          {!enabled && (
            <Typography variant="body2" sx={{ color: colors.text.subtle }}>
              {DISABLED_TEXT}
            </Typography>
          )}
          {toggle.missingFields && (
            <Alert
              severity="warning"
              action={
                <Button color="inherit" size="small" onClick={() => setDialog("edit")}>
                  Completar configuración
                </Button>
              }
            >
              {incompleteText(toggle.missingFields)}
            </Alert>
          )}
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
            toggle.clearMissing();
            successDispatch(SAVED_TEXT);
          }}
        />
      )}

      <ConfirmationModal
        isOpen={toggle.requested !== null}
        onCancel={toggle.cancel}
        onConfirm={() => void toggle.confirm()}
        title={toggle.requested ? "Activar integración con Huawei" : "Desactivar integración con Huawei"}
        confirmLabel={toggle.requested ? "Activar" : "Desactivar"}
        confirmColor={toggle.requested ? "success" : "error"}
        confirmPending={toggle.isPending}
      >
        {toggle.requested
          ? "La planta empezará a sincronizar su producción desde Huawei."
          : "La planta dejará de sincronizar su producción desde Huawei. La configuración guardada se conserva."}
      </ConfirmationModal>
    </Paper>
  );
};
