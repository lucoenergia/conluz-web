import { radii, shadows } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { useState, useCallback, useEffect, type FC } from "react";
import { Box, Typography, Paper, Snackbar, Alert, Avatar } from "@mui/material";
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
import { useQueryClient } from "@tanstack/react-query";
import { getGetShellyConfigQueryKey, getGetDatadisConfigQueryKey } from "../../api/consumption/consumption";
import { getGetHuaweiConfigQueryKey } from "../../api/production/production";

/**
 * Integration credentials change only when someone edits them on this page, so
 * refetching on every visit bought nothing and cost a full round trip each
 * time. Five minutes keeps a return visit instant; `save()` invalidates
 * explicitly, so an edit is never served from a stale cache.
 */
const CONFIG_STALE_TIME = 5 * 60 * 1000;

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
    color: colors.accent.cyan,
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
    color: colors.success.main,
    description:
      "Lecturas en tiempo real desde dispositivos Shelly instalados en la comunidad. No requiere credenciales adicionales.",
    fields: [] as string[],
  },
];

const ACCENT = colors.brand.main;

export const IntegrationsPage: FC = () => {
  const activeCommunityId = useActiveCommunity();
  const queryClient = useQueryClient();

  const [state, setState] = useState<IntegrationState>({
    datadis: { enabled: false, username: "", password: "", baseUrl: "" },
    huawei: { enabled: false, username: "", password: "", baseUrl: "" },
    shelly: { enabled: false },
  });

  const [configLoaded, setConfigLoaded] = useState<{ [key: string]: boolean }>({});
  const [snack, setSnack] = useState<string | null>(null);
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});

  const { data: plantsData, isLoading: plantsLoading } = useGetAllPlants(
    activeCommunityId ?? "",
    { size: 1 },
    { query: { enabled: !!activeCommunityId, staleTime: CONFIG_STALE_TIME } },
  );
  const firstPlantId = plantsData?.items?.[0]?.id ?? "";

  const { data: shellyConfig, isLoading: shellyLoading } = useGetShellyConfig(
    activeCommunityId ?? "",
    { query: { enabled: !!activeCommunityId, staleTime: CONFIG_STALE_TIME } },
  );
  const { data: datadisConfig, isLoading: datadisLoading } = useGetDatadisConfig(
    activeCommunityId ?? "",
    { query: { enabled: !!activeCommunityId, staleTime: CONFIG_STALE_TIME } },
  );
  const { data: huaweiConfig, isLoading: huaweiLoading } = useGetHuaweiConfig(
    firstPlantId,
    { query: { enabled: !!firstPlantId, staleTime: CONFIG_STALE_TIME } },
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
      setState(prev => ({
        ...prev,
        datadis: {
          enabled: datadisConfig.enabled ?? false,
          username: datadisConfig.username ?? "",
          password: "", // Never prefill - security
          baseUrl: datadisConfig.baseUrl || "",
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
        // The cache is now stale by definition — without this the staleTime
        // above would keep serving the pre-save values for up to five minutes.
        const key =
          id === "datadis" ? getGetDatadisConfigQueryKey(activeCommunityId ?? "")
          : id === "shelly" ? getGetShellyConfigQueryKey(activeCommunityId ?? "")
          : getGetHuaweiConfigQueryKey(firstPlantId);
        await queryClient.invalidateQueries({ queryKey: key });
      } catch (error) {
        console.error("Error saving integration:", error);
        setSnack("Error al guardar la configuración");
      } finally {
        setSaving((prev) => ({ ...prev, [id]: false }));
      }
    },
    [state, activeCommunityId, firstPlantId, configureDatadis, configureHuawei, configureShelly, queryClient],
  );

  const activeCount = Object.values(state).filter((v) => v.enabled).length;
  // Per provider, not per page. The old gate was
  // `shellyLoading || datadisLoading || huaweiLoading` in front of an early
  // return, so the breadcrumb, the title and the two cards that were already
  // resolved all waited on the slowest request — and Huawei is necessarily the
  // slowest, because its config is keyed by plant id and cannot even start
  // until the plants request comes back. Measured: chrome appeared at the same
  // moment as the cards, a full extra round trip after it could have.
  //
  // Huawei counts `plantsLoading` too: while plants is in flight its own query
  // is disabled, so it reports "not loading" while very much not being ready.
  const loadingByProvider: Record<string, boolean> = {
    datadis: datadisLoading,
    shelly: shellyLoading,
    huawei: plantsLoading || huaweiLoading,
  };
  const anyConfigLoading = Object.values(loadingByProvider).some(Boolean);

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
              <Typography variant="h4" component="h1" sx={{ letterSpacing: "-0.5px" }}>
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
              {/* Not "0 de 3" or "1 de 3" while requests are still landing: a
                  partial count is a wrong statement, and it visibly jumps when
                  the rest arrive. Say what is actually known. */}
              {anyConfigLoading
                ? "Comprobando integraciones…"
                : `${activeCount} de ${PROVIDERS.length} integraciones activas`}
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
            isLoading={loadingByProvider[p.id]}
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
