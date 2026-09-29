import { radii, shadows } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { useState, useCallback, useEffect, type FC } from "react";
import { Box, Typography, Paper, Snackbar, Alert, Avatar } from "@mui/material";
import { BreadCrumb } from "../../components/Breadcrumb";
import { useGetDatadisConfig } from "../../api/consumption/consumption";
import { useGetHuaweiConfig } from "../../api/production/production";
import { useGetShellyConfig } from "../../api/consumption/consumption";
import { useGetAllPlants } from "../../api/plants/plants";
import { IntegrationCard } from "./IntegrationCard";
import ExtensionIcon from "@mui/icons-material/Extension";
import BoltIcon from "@mui/icons-material/Bolt";
import type { ConfigureHuaweiBody, ConfigureShellyBody } from "../../api/models";
import { colors, alphas } from "../../theme/tokens";
import { useActiveCommunity } from "../../context/community.context";
import { useActiveCommunityResource } from "../../hooks/useActiveCommunityResource";
import { useCommunityActions, usePlantActions, type MaybeAction } from "../../hooks/actions";

/**
 * Integration credentials change only when someone edits them on this page, so
 * refetching on every visit bought nothing and cost a full round trip each
 * time. Five minutes keeps a return visit instant; each configure action
 * invalidates its own config key, so an edit is never served from a stale
 * cache.
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

const SAVE_FAILED = "Error al guardar la configuración";

/**
 * Turns one configuration action into the card's Guardar button.
 *
 * The actions layer hands over something that takes a body and reports success
 * as a boolean; the card takes no arguments and has nowhere to put the result.
 * Wrapping keeps each half where it belongs -- the body is read off the form at
 * click time, and the wording of the outcome stays on the screen, which is what
 * the actions layer's own doc asks for.
 *
 * `undefined` in, `undefined` out: an action the caller was not given produces
 * no button, and therefore no card. `isPending` is carried through rather than
 * recomputed, so the spinner is the mutation's own state.
 */
function bindSave<TBody>(
  action: MaybeAction<[TBody], boolean>,
  body: () => TBody,
  okMessage: string,
  report: (message: string) => void,
): MaybeAction<[], void> {
  if (!action) return undefined;
  return {
    isPending: action.isPending,
    run: async () => {
      report((await action.run(body())) ? okMessage : SAVE_FAILED);
    },
  };
}

export const IntegrationsPage: FC = () => {
  const activeCommunityId = useActiveCommunity();
  const activeCommunity = useActiveCommunityResource();

  const [state, setState] = useState<IntegrationState>({
    datadis: { enabled: false, username: "", password: "", baseUrl: "" },
    huawei: { enabled: false, username: "", password: "", baseUrl: "" },
    shelly: { enabled: false },
  });

  const [configLoaded, setConfigLoaded] = useState<{ [key: string]: boolean }>({});
  const [snack, setSnack] = useState<string | null>(null);

  const { data: plantsData, isLoading: plantsLoading } = useGetAllPlants(
    activeCommunityId ?? "",
    { size: 1 },
    { query: { enabled: !!activeCommunityId, staleTime: CONFIG_STALE_TIME } },
  );
  // The whole plant, not just its id: Huawei's endpoint is plant-scoped, so it
  // is this plant's own canManage that decides the card -- and the answer
  // already rides along in the payload the page fetches anyway.
  //
  // Which plant this is remains arbitrary (`size: 1`, no sort, no selector);
  // that defect is not fixed here, and gating on the plant rather than on the
  // community is what lets the gate survive the move to a per-plant section.
  const firstPlant = plantsData?.items?.[0];
  const firstPlantId = firstPlant?.id ?? "";

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

  const { configureDatadis, configureShelly } = useCommunityActions().forCommunity(activeCommunity).actions;
  const { configureHuawei } = usePlantActions().forPlant(firstPlant).actions;

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

  // One entry per provider, and a provider the caller may not configure has
  // none. Mounting a card is therefore the same decision as having the action,
  // rather than a check beside it that could disagree.
  //
  // Reading the configuration needs exactly what writing it needs -- GET and
  // PUT on all three carry the same @PreAuthorize -- so there is no read-only
  // card to fall back to: a card that cannot be saved cannot be filled either.
  const saves: Record<string, MaybeAction<[], void>> = {
    datadis: bindSave(
      configureDatadis,
      () => ({
        enabled: state.datadis.enabled,
        username: state.datadis.username,
        password: state.datadis.password,
        baseUrl: state.datadis.baseUrl,
      }),
      "Datadis guardado correctamente",
      setSnack,
    ),
    huawei: bindSave(
      configureHuawei,
      () => ({
        enabled: state.huawei.enabled,
        username: state.huawei.username,
        password: state.huawei.password,
        baseUrl: state.huawei.baseUrl,
      }),
      "Configuración de Huawei guardada correctamente",
      setSnack,
    ),
    shelly: bindSave(
      configureShelly,
      () => ({ enabled: state.shelly.enabled }),
      "Shelly Cloud guardado correctamente",
      setSnack,
    ),
  };

  const cards = PROVIDERS.flatMap((provider) => {
    const save = saves[provider.id];
    return save ? [{ provider, save }] : [];
  });

  // Counted over the cards that exist, not over PROVIDERS: saying "1 de 3" to
  // someone who is shown two of them describes a page they are not looking at.
  const activeCount = cards.filter(({ provider }) => state[provider.id].enabled).length;
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
  // The community and the plant decide which cards exist at all, so nothing can
  // be counted until they have arrived either -- and a card the caller turns
  // out not to have is not a config request that is still in flight.
  const anyConfigLoading =
    activeCommunity === undefined ||
    plantsLoading ||
    cards.some(({ provider }) => loadingByProvider[provider.id]);

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
                : `${activeCount} de ${cards.length} integraciones activas`}
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
        {cards.map(({ provider, save }) => (
          <IntegrationCard
            key={provider.id}
            provider={provider}
            accent={ACCENT}
            value={state[provider.id]}
            onChange={update}
            save={save}
            isLoading={loadingByProvider[provider.id]}
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
