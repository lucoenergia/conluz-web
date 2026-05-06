import { useState, useCallback, type FC } from "react";
import { Box, Typography, Paper, Snackbar, Alert, Avatar } from "@mui/material";
import { BreadCrumb } from "../../components/Breadcrumb";
import { useConfigureDatadis } from "../../api/consumption/consumption";
import { useConfigureHuawei } from "../../api/production/production";
import { useConfigureShelly } from "../../api/consumption/consumption";
import { IntegrationCard } from "./IntegrationCard";
import ExtensionIcon from "@mui/icons-material/Extension";
import BoltIcon from "@mui/icons-material/Bolt";
import type { ConfigureDatadisBody, ConfigureHuaweiBody, ConfigureShellyBody } from "../../api/models";

interface IntegrationState {
  datadis: { enabled: boolean; username: string; password: string; baseUrl: string };
  huawei: { enabled: boolean; username: string; password: string; baseUrl: string };
  shelly: { enabled: boolean };
}

const PROVIDERS = [
  {
    id: "datadis" as const,
    name: "Datadis",
    icon: "electric_meter",
    color: "#0ea5e9",
    description:
      "Plataforma oficial de las distribuidoras eléctricas para acceder a datos de consumo de los socios.",
    fields: ["credentials"] as string[],
    urlPlaceholder: "https://datadis.es/api-private",
    help: "Necesitas una cuenta dada de alta en datadis.es con permiso de consulta de los CUPS de la comunidad.",
  },
  {
    id: "huawei" as const,
    name: "Huawei FusionSolar",
    icon: "solar_power",
    color: "#dc2626",
    description: "Conexión con inversores Huawei para recoger datos de producción de las plantas fotovoltaicas.",
    fields: ["credentials"] as string[],
    urlPlaceholder: "https://eu5.fusionsolar.huawei.com/thirdData",
    help: "Usa una cuenta de tipo Northbound API. Confirma con tu instalador la región correcta del endpoint.",
  },
  {
    id: "shelly" as const,
    name: "Shelly Cloud",
    icon: "sensors",
    color: "#10b981",
    description:
      "Lecturas en tiempo real desde dispositivos Shelly instalados en la comunidad. No requiere credenciales adicionales.",
    fields: [] as string[],
  },
];

const ACCENT = "#667eea";

export const IntegrationsPage: FC = () => {
  const [state, setState] = useState<IntegrationState>({
    datadis: { enabled: false, username: "", password: "", baseUrl: "" },
    huawei: { enabled: false, username: "", password: "", baseUrl: "" },
    shelly: { enabled: false },
  });

  const [snack, setSnack] = useState<string | null>(null);
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});

  const configureDatadis = useConfigureDatadis();
  const configureHuawei = useConfigureHuawei();
  const configureShelly = useConfigureShelly();

  const update = useCallback((id: string, patch: Record<string, unknown>) => {
    setState((s) => ({
      ...s,
      [id]: { ...s[id as keyof IntegrationState], ...patch },
    }));
  }, []);

  const save = useCallback(
    async (id: string) => {
      setSaving((prev) => ({ ...prev, [id]: true }));
      try {
        if (id === "datadis") {
          const val = state.datadis;
          await configureDatadis.mutateAsync({
            data: {
              enabled: val.enabled,
              username: val.username,
              password: val.password,
              baseUrl: val.baseUrl,
            } as ConfigureDatadisBody,
          });
          setSnack("Datadis guardado correctamente");
        } else if (id === "huawei") {
          const val = state.huawei;
          await configureHuawei.mutateAsync({
            data: {
              enabled: val.enabled,
              username: val.username,
              password: val.password,
              baseUrl: val.baseUrl,
            } as ConfigureHuaweiBody,
          });
          setSnack("Huawei FusionSolar guardado correctamente");
        } else if (id === "shelly") {
          const val = state.shelly;
          await configureShelly.mutateAsync({
            data: { enabled: val.enabled } as ConfigureShellyBody,
          });
          setSnack("Shelly Cloud guardado correctamente");
        }
      } catch (error) {
        console.error("Error saving integration:", error);
        setSnack("Error al guardar la configuración");
      } finally {
        setSaving((prev) => ({ ...prev, [id]: false }));
      }
    },
    [state, configureDatadis, configureHuawei, configureShelly],
  );

  const activeCount = Object.values(state).filter((v) => v.enabled).length;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2, sm: 3 },
        p: { xs: 0, sm: 2, md: 3 },
        minHeight: "calc(100vh - 64px)",
        background: "#f5f7fa",
      }}
    >
      {/* Breadcrumb */}
      <Box sx={{ px: { xs: 2, sm: 0 }, width: "100%" }}>
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: "Integraciones", href: "/integrations" },
          ]}
        />
      </Box>

      {/* Hero Section */}
      <Box sx={{ px: { xs: 2, sm: 0 }, width: "100%", maxWidth: 960, mx: "auto" }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: { xs: 2, sm: 3 },
            background: ACCENT,
            color: "white",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)", width: 56, height: 56 }}>
              <ExtensionIcon sx={{ fontSize: 32, color: "white" }} />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.5px" }}>
                Integraciones
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Conecta servicios externos para sincronizar datos de consumo y producción
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Summary strip */}
      <Box sx={{ px: { xs: 2, sm: 0 }, width: "100%", maxWidth: 960, mx: "auto" }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.5, sm: 2 },
            borderRadius: 2,
            bgcolor: "white",
            boxShadow: "0 2px 8px 0 rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            gap: { xs: 1.5, sm: 3 },
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <BoltIcon sx={{ fontSize: 18, color: "#10b981" }} />
            <Typography variant="body2" sx={{ color: "#374151", fontWeight: 500 }}>
              {activeCount} de {PROVIDERS.length} integraciones activas
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" sx={{ color: "#6b7280" }}>
            Última sincronización: hace 4 minutos
          </Typography>
        </Paper>
      </Box>

      {/* Cards stack */}
      <Box
        sx={{
          px: { xs: 2, sm: 0 },
          width: "100%",
          maxWidth: 960,
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          gap: { xs: 2, sm: 2.5 },
        }}
      >
        {PROVIDERS.map((p) => (
          <IntegrationCard
            key={p.id}
            provider={p}
            accent={ACCENT}
            value={state[p.id]}
            onChange={update}
            onSave={save}
            isSaving={!!saving[p.id]}
          />
        ))}
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={!!snack}
        autoHideDuration={3500}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snack?.includes("Error") ? "error" : "success"}
          onClose={() => setSnack(null)}
          sx={{ borderRadius: "6px", fontWeight: 500 }}
        >
          {snack}
        </Alert>
      </Snackbar>
    </Box>
  );
};
