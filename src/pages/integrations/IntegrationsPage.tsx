import { radii, shadows } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { useState, useCallback, useEffect, type FC } from "react";
import { Box, Typography, Paper, Snackbar, Alert, Avatar, CircularProgress } from "@mui/material";
import { BreadCrumb } from "../../components/Breadcrumb";
import { useConfigureDatadis } from "../../api/consumption/consumption";
import { useConfigureHuawei } from "../../api/production/production";
import { useConfigureShelly } from "../../api/consumption/consumption";
import { useGetDatadisConfig } from "../../api/consumption/consumption";
import { useGetHuaweiConfig } from "../../api/production/production";
import { useGetShellyConfig } from "../../api/consumption/consumption";
import { useGetAllPlants } from "../../api/plants/plants";
import { IntegrationCard } from "./IntegrationCard";
import ExtensionIcon from "@mui/icons-material/Extension";
import BoltIcon from "@mui/icons-material/Bolt";
import type { ConfigureDatadisBody, ConfigureHuaweiBody, ConfigureShellyBody } from "../../api/models";
import { colors, alphas } from "../../theme/tokens";
import { useActiveCommunity } from "../../context/community.context";

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
    color: colors.chart.cyan,
    description:
      "Plataforma oficial de las distribuidoras eléctricas para acceder a datos de consumo de los socios.",
    fields: ["credentials"] as string[],
    urlPlaceholder: "https://datadis.es/api-private",
    help: "Necesitas una cuenta dada de alta en datadis.es con permiso de consulta de los CUPS de la comunidad.",
  },
  {
    id: "huawei" as const,
    name: "Huawei",
    icon: "solar_power",
    color: colors.error.dark,
    description: "Conexión con inversores Huawei para recoger datos de producción de las plantas fotovoltaicas.",
    fields: ["credentials"] as string[],
    urlPlaceholder: "https://eu5.fusionsolar.huawei.com/thirdData",
    help: "Usa una cuenta de tipo Northbound API. Confirma con tu instalador la región correcta del endpoint.",
  },
    {
    id: "shelly" as const,
    name: "Shelly",
    icon: "sensors",
    color: colors.success,
    description:
      "Lecturas en tiempo real desde dispositivos Shelly instalados en la comunidad. No requiere credenciales adicionales.",
    fields: [] as string[],
  },
];

const ACCENT = colors.brand.main;

export const IntegrationsPage: FC = () => {
  const activeCommunityId = useActiveCommunity();

  const [state, setState] = useState<IntegrationState>({
    datadis: { enabled: false, username: "", password: "", baseUrl: "" },
    huawei: { enabled: false, username: "", password: "", baseUrl: "" },
    shelly: { enabled: false },
  });

  const [configLoaded, setConfigLoaded] = useState<{ [key: string]: boolean }>({});
  const [snack, setSnack] = useState<string | null>(null);
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});

  const { data: plantsData } = useGetAllPlants({ size: 1 });
  const firstPlantId = plantsData?.items?.[0]?.id ?? "";

  const { data: shellyConfig, isLoading: shellyLoading } = useGetShellyConfig(
    activeCommunityId ?? "",
    { query: { enabled: !!activeCommunityId } },
  );
  const { data: datadisConfig, isLoading: datadisLoading } = useGetDatadisConfig(
    activeCommunityId ?? "",
    { query: { enabled: !!activeCommunityId } },
  );
  const { data: huaweiConfig, isLoading: huaweiLoading } = useGetHuaweiConfig(
    firstPlantId,
    { query: { enabled: !!firstPlantId } },
  );

  const configureDatadis = useConfigureDatadis();
  const configureHuawei = useConfigureHuawei();
  const configureShelly = useConfigureShelly();

  // Prefill state when config data arrives
  useEffect(() => {
    if (shellyConfig && !configLoaded.shelly) {
      const config = shellyConfig as ConfigureShellyBody;
      setState(prev => ({
        ...prev,
        shelly: { enabled: config.enabled ?? false }
      }));
      setConfigLoaded(prev => ({ ...prev, shelly: true }));
    }
  }, [shellyConfig, configLoaded.shelly]);

  useEffect(() => {
    if (datadisConfig && !configLoaded.datadis) {
      const config = datadisConfig as ConfigureDatadisBody;
      setState(prev => ({
        ...prev,
        datadis: {
          enabled: config.enabled ?? false,
          username: config.username || "",
          password: "", // Never prefill - security
          baseUrl: config.baseUrl || "",
        }
      }));
      setConfigLoaded(prev => ({ ...prev, datadis: true }));
    }
  }, [datadisConfig, configLoaded.datadis]);

  useEffect(() => {
    if (huaweiConfig && !configLoaded.huawei) {
      const config = huaweiConfig as ConfigureHuaweiBody;
      setState(prev => ({
        ...prev,
        huawei: {
          enabled: config.enabled ?? false,
          username: config.username || "",
          password: "", // Never prefill - security
          baseUrl: config.baseUrl || "",
        }
      }));
      setConfigLoaded(prev => ({ ...prev, huawei: true }));
    }
  }, [huaweiConfig, configLoaded.huawei]);

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
            communityId: activeCommunityId ?? "",
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
            plantId: firstPlantId,
            data: {
              enabled: val.enabled,
              username: val.username,
              password: val.password,
              baseUrl: val.baseUrl,
            } as ConfigureHuaweiBody,
          });
          setSnack("Configuración de Huawei guardada correctamente");
        } else if (id === "shelly") {
          const val = state.shelly;
          await configureShelly.mutateAsync({
            communityId: activeCommunityId ?? "",
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
    [state, activeCommunityId, firstPlantId, configureDatadis, configureHuawei, configureShelly],
  );

  const activeCount = Object.values(state).filter((v) => v.enabled).length;
  const isLoading = shellyLoading || datadisLoading || huaweiLoading;

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2, sm: 3 },
        p: { xs: 0, sm: 2, md: 3 },
        minHeight: "calc(100vh - 64px)",
        background: colors.background.default,
      }}
    >
      {/* Breadcrumb */}
      <Box sx={sxStyles.pageContainerFull}>
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: "Integraciones", href: "/integrations" },
          ]}
        />
      </Box>

      {/* Hero Section */}
      <Box sx={[sxStyles.pageContainerFull, { maxWidth: 960, mx: "auto" }]}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: { xs: radii.default, sm: radii.large },
            background: ACCENT,
            color: "white",
          }}
        >
          <Box sx={sxStyles.flexRowCenter}>
            <Avatar sx={{ bgcolor: alphas.white.soft, width: 56, height: 56 }}>
              <ExtensionIcon sx={{ fontSize: 32, color: "white" }} />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ letterSpacing: "-0.5px" }}>
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
      <Box sx={[sxStyles.pageContainerFull, { maxWidth: 960, mx: "auto" }]}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.5, sm: 2 },
            borderRadius: radii.default,
            bgcolor: "white",
            boxShadow: shadows.breadcrumb,
            display: "flex",
            alignItems: "center",
            gap: { xs: 1.5, sm: 3 },
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <BoltIcon sx={{ fontSize: 18, color: "success.main" }} />
            <Typography variant="body2" sx={{ color: colors.text.body, fontWeight: 500 }}>
              {activeCount} de {PROVIDERS.length} integraciones activas
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
        </Paper>
      </Box>

      {/* Cards stack */}
      <Box
        sx={[
          sxStyles.pageContainerFull,
          {
            maxWidth: 960,
            mx: "auto",
            display: "flex",
            flexDirection: "column",
            gap: { xs: 2, sm: 2.5 },
          },
        ]}
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
          sx={{ borderRadius: radii.default, fontWeight: 500 }}
        >
          {snack}
        </Alert>
      </Snackbar>
    </Box>
  );
};
