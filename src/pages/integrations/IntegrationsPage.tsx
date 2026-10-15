import { radii, shadows } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { useState, useCallback, useEffect, useRef, type FC, type RefObject } from "react";
import { Box, Typography, Paper, Snackbar, Alert, Avatar, Button, Switch } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { BreadCrumb } from "../../components/Breadcrumb";
import { getGetDatadisConfigQueryKey, useGetDatadisConfig } from "../../api/consumption/consumption";
import { useGetShellyConfig } from "../../api/consumption/consumption";
import { IntegrationCard } from "./IntegrationCard";
import ExtensionIcon from "@mui/icons-material/Extension";
import BoltIcon from "@mui/icons-material/Bolt";
import type { ConfigureShellyBody } from "../../api/models";
import { colors, alphas } from "../../theme/tokens";
import { useActiveCommunity } from "../../context/community.context";
import { useActiveCommunityResource } from "../../hooks/useActiveCommunityResource";
import { useCommunityActions, type Action, type MaybeAction } from "../../hooks/actions";
import { ConfirmationModal } from "../../components/Modals/ConfirmationModal";
import { CommunityScopeHeader } from "../../components/CommunityScopeHeader";
import { communityLabel, useActiveCommunityName } from "../../hooks/useActiveCommunityName";
import { useCredentialsForm } from "../../hooks/useCredentialsForm";
import { useIntegrationToggle } from "../../hooks/useIntegrationToggle";
import {
  CREDENTIALS_FIELDS,
  buildCredentialsBody,
  passwordRequiredMessage,
  storedPasswordFrom,
  type CredentialsField,
} from "../../utils/integrationCredentials";
import { DISABLED_TEXT, incompleteText } from "../../utils/integrationStatus";

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
    urlPlaceholder: "https://datadis.es",
    help: "Necesitas una cuenta dada de alta en datadis.es con permiso de consulta de los CUPS de la comunidad.",
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
// "Error" is what turns the snack red.
const DATADIS_TOGGLE_FAILED = "Error al cambiar el estado de la integración con Datadis. Inténtalo de nuevo.";

const EMPTY_DATADIS: IntegrationState["datadis"] = { enabled: false, username: "", password: "", baseUrl: "" };

/** A refused enable's first missing field the form has, or the first field when it names none. */
const firstMissingField = (names: string[]): CredentialsField =>
  names.find((name): name is CredentialsField => CREDENTIALS_FIELDS.includes(name as CredentialsField)) ?? "username";

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

/**
 * Turns a save the caller may perform into the one the card is given: same gate,
 * same pending flag, but clicking asks for confirmation instead of writing --
 * and, for a form with rules, only once `canProceed` lets it through, so a
 * save the form already knows is wrong neither asks nor writes (#245).
 *
 * Credentials are community configuration and the dialog names the community
 * (#186), so the write cannot be aimed at the wrong one by accident. The card's
 * contract is "decide WHEN the save happens", which is exactly this seam, so no
 * card prop changes and `isPending` stays the mutation's own state.
 *
 * Only ever called with a save that exists: `cards` has already dropped the
 * providers whose action was never handed over, so one of those renders no card
 * and can never reach the confirmation either.
 */
function requestSave(
  save: Action<[], void>,
  providerId: string,
  ask: (id: string) => void,
  canProceed: () => boolean = () => true,
): Action<[], void> {
  return {
    isPending: save.isPending,
    run: async () => {
      if (canProceed()) ask(providerId);
    },
  };
}

export const IntegrationsPage: FC = () => {
  const activeCommunityId = useActiveCommunity();
  const activeCommunity = useActiveCommunityResource();
  const communityName = useActiveCommunityName();

  const queryClient = useQueryClient();
  const [state, setState] = useState<IntegrationState>({
    datadis: EMPTY_DATADIS,
    shelly: { enabled: false },
  });

  const [configLoaded, setConfigLoaded] = useState<{ [key: string]: boolean }>({});
  const [snack, setSnack] = useState<string | null>(null);
  // Credentials are community configuration: saving them into the wrong
  // community is the silent failure #186 guards against, so every save goes
  // through a confirmation that names the community.
  const [pendingSaveId, setPendingSaveId] = useState<string | null>(null);

  const { data: shellyConfig, isLoading: shellyLoading } = useGetShellyConfig(
    activeCommunityId ?? "",
    { query: { enabled: !!activeCommunityId, staleTime: CONFIG_STALE_TIME } },
  );
  const { data: datadisConfig, error: datadisError, isLoading: datadisLoading } = useGetDatadisConfig(
    activeCommunityId ?? "",
    { query: { enabled: !!activeCommunityId, staleTime: CONFIG_STALE_TIME } },
  );

  // Live from the read, not copied into state: the refetch after a save is what
  // turns "none stored" into "stored".
  const datadisPasswordSet = storedPasswordFrom(datadisConfig, datadisError);
  const datadisForm = useCredentialsForm(state.datadis, datadisPasswordSet);

  const { configureDatadis, configureShelly, enableDatadis, disableDatadis } =
    useCommunityActions().forCommunity(activeCommunity).actions;

  // The stored `enabled`, never a copy: the switch writes through its own
  // endpoints, and the refetch after each write is what moves it (#256).
  const datadisEnabled = datadisConfig?.enabled === true;
  const datadisToggle = useIntegrationToggle({
    enabled: datadisEnabled,
    enable: enableDatadis,
    disable: disableDatadis,
    incompleteCode: "DATADIS_CONFIG_INCOMPLETE",
    notFoundCode: "DATADIS_CONFIG_NOT_FOUND",
    // Reset, not refetch: a refetch that fails keeps the stale configuration
    // on screen, and the point is to show that there is none any more. The
    // form forgets it too, so the create starts from nothing.
    onNotFound: () => {
      setState((prev) => ({ ...prev, datadis: EMPTY_DATADIS }));
      setConfigLoaded((prev) => ({ ...prev, datadis: false }));
      void queryClient.resetQueries({ queryKey: getGetDatadisConfigQueryKey(activeCommunityId ?? "") });
    },
    onError: () => setSnack(DATADIS_TOGGLE_FAILED),
  });

  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const baseUrlRef = useRef<HTMLInputElement>(null);
  const datadisInputs: Record<CredentialsField, RefObject<HTMLInputElement | null>> = {
    username: usernameRef,
    password: passwordRef,
    baseUrl: baseUrlRef,
  };
  const completeDatadis = () => {
    const input = datadisInputs[firstMissingField(datadisToggle.missingFieldNames ?? [])].current;
    input?.scrollIntoView?.({ block: "center", behavior: "smooth" });
    input?.focus();
  };

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
    // Not bindSave: a refusal for a missing password belongs on the password
    // field rather than in the generic snack (#245).
    datadis: configureDatadis && {
      isPending: configureDatadis.isPending,
      run: async () => {
        const sentPassword = state.datadis.password;
        const result = await configureDatadis.run(buildCredentialsBody(state.datadis));
        if ("ok" in result) {
          // Emptied, so the next save keeps what was just stored instead of
          // sending it again; the refetch then reports it as stored.
          update("datadis", { password: "" });
          datadisForm.reset();
          datadisToggle.clearMissing();
          setSnack("Datadis guardado correctamente");
          return;
        }
        const passwordRequired = passwordRequiredMessage(result.error, "DATADIS_CONFIG_PASSWORD_REQUIRED");
        if (passwordRequired) datadisForm.showPasswordRefusal(passwordRequired, sentPassword);
        else setSnack(SAVE_FAILED);
      },
    },
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

  // Resolved from the cards, not from PROVIDERS: a provider whose save was
  // never handed over has no card to click, so it must not be confirmable
  // either.
  const pendingCard = cards.find(({ provider }) => provider.id === pendingSaveId);

  // Counted over the cards that exist, not over PROVIDERS: saying "1 de 3" to
  // someone who is shown two of them describes a page they are not looking at.
  const isEnabled: Record<string, boolean> = { datadis: datadisEnabled, shelly: state.shelly.enabled };
  const activeCount = cards.filter(({ provider }) => isEnabled[provider.id]).length;
  // Per provider, not per page: the breadcrumb, the title and a card already
  // resolved do not wait on another card's request.
  const loadingByProvider: Record<string, boolean> = {
    datadis: datadisLoading,
    shelly: shellyLoading,
  };
  // The community decides which cards exist at all, so nothing can be counted
  // until it has arrived -- and a card the caller turns out not to have is not
  // a config request that is still in flight.
  const anyConfigLoading =
    activeCommunity === undefined ||
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
            onChange={update}
            isLoading={loadingByProvider[provider.id]}
            {...(provider.id === "datadis"
              ? {
                  value: { ...state.datadis, enabled: datadisEnabled, passwordSet: datadisPasswordSet },
                  errors: datadisForm.errors,
                  onFieldBlur: datadisForm.touch,
                  inputRefs: datadisInputs,
                  // Only once configured: there is nothing to turn on before.
                  headerControl: datadisConfig ? (
                    <Switch
                      checked={datadisEnabled}
                      disabled={datadisToggle.isPending}
                      onChange={(e) => datadisToggle.request(e.target.checked)}
                      slotProps={{ input: { role: "switch", "aria-label": "Integración con Datadis activa" } }}
                      sx={{
                        "& .MuiSwitch-switchBase.Mui-checked": { color: ACCENT },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: ACCENT },
                      }}
                    />
                  ) : null,
                  status: datadisConfig && (!datadisEnabled || datadisToggle.missingFields) && (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      {!datadisEnabled && (
                        <Typography variant="body2" sx={{ color: colors.text.subtle }}>
                          {DISABLED_TEXT}
                        </Typography>
                      )}
                      {datadisToggle.missingFields && (
                        <Alert
                          severity="warning"
                          action={
                            <Button color="inherit" size="small" onClick={completeDatadis}>
                              Completar configuración
                            </Button>
                          }
                        >
                          {incompleteText(datadisToggle.missingFields)}
                        </Alert>
                      )}
                    </Box>
                  ),
                  save: requestSave(save, provider.id, setPendingSaveId, datadisForm.attemptSave),
                }
              : {
                  value: state[provider.id],
                  save: requestSave(save, provider.id, setPendingSaveId),
                })}
          />
        ))}
      </Box>

      <ConfirmationModal
        isOpen={pendingCard !== undefined}
        onCancel={() => setPendingSaveId(null)}
        onConfirm={() => {
          void pendingCard?.save.run();
          setPendingSaveId(null);
        }}
        confirmLabel="Guardar"
        confirmColor="primary"
        title={`Guardar integración en ${communityLabel(communityName)}`}
        scopeHeader={<CommunityScopeHeader name={communityName} />}
      >
        <Typography sx={{ color: "text.secondary", lineHeight: 1.6 }}>
          La configuración de <strong>{pendingCard?.provider.name}</strong> se guardará en{" "}
          <strong>{communityLabel(communityName)}</strong> y sustituirá la que tenga ahora esta comunidad.
        </Typography>
      </ConfirmationModal>

      <ConfirmationModal
        isOpen={datadisToggle.requested !== null}
        onCancel={datadisToggle.cancel}
        onConfirm={() => void datadisToggle.confirm()}
        title={datadisToggle.requested ? "Activar integración con Datadis" : "Desactivar integración con Datadis"}
        confirmLabel={datadisToggle.requested ? "Activar" : "Desactivar"}
        confirmColor={datadisToggle.requested ? "success" : "error"}
        confirmPending={datadisToggle.isPending}
        confirmDisabled={datadisToggle.isPending}
        scopeHeader={<CommunityScopeHeader name={communityName} />}
      >
        <Typography sx={{ color: "text.secondary", lineHeight: 1.6 }}>
          {datadisToggle.requested ? "Se empezará a sincronizar" : "Se dejará de sincronizar"} desde Datadis el consumo de
          los socios de <strong>{communityLabel(communityName)}</strong>.
          {!datadisToggle.requested && " La configuración guardada se conserva."}
        </Typography>
      </ConfirmationModal>

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
