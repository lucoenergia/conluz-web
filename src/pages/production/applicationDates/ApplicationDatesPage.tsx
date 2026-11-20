import { useLayoutEffect, type FC, type ReactNode } from "react";
import { Box, Link } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { Navigate, Link as RouterLink, useParams, useSearchParams } from "react-router";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "dayjs/locale/es";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import EditCalendarOutlinedIcon from "@mui/icons-material/EditCalendarOutlined";
import { SharingAgreementResponseStatus } from "../../../api/models";
import { BreadCrumb } from "../../../components/Breadcrumb";
import { DetailHeader } from "../../../components/DetailHeader";
import { EmptyState } from "../../../components/EmptyState";
import { LoadErrorAlert } from "../../../components/LoadErrorAlert";
import { Notice } from "../../../components/Notice";
import { SharingAgreementStatusChip } from "../../../components/SharingAgreementStatusChip";
import { useSharingAgreementCoefficientActions } from "../../../hooks/actions";
import { sxStyles } from "../../../theme/sx";
import { ObservationProgress } from "../observedSharing/ObservationProgress";
import { agreementObservationPath } from "../observedSharing/observedSharingRoutes";
import { useSharingAgreementObservationData } from "../observedSharing/useSharingAgreementObservationData";
import { useSharingAgreementDetailData } from "../useSharingAgreementDetailData";
import { ApplicationDatesFlow } from "./ApplicationDatesFlow";
import { APPLICATION_DATES_FROM_OBSERVED, isFromObserved } from "./applicationDatesRoutes";

/**
 * Sets the application dates of an agreement's coefficients, and the closing
 * dates of the supplies that leave with it, after a dry run of every effect
 * (#419). Opened from the agreement, the dates start empty; opened from
 * observed sharing (`?desde=reparto-observado`), they start from what it
 * observed (UI-AGR-032).
 *
 * The community the dates are written in is stated by the layout's scope
 * strip, which reads "Comunidad activa" and "Los datos y los cambios de esta
 * página pertenecen a esta comunidad" on a phone as on every page; the page
 * does not repeat it.
 *
 * The route admits whoever may list the plant's agreements; the write is the
 * agreement's own `canManage`, so the page renders the flow only once the
 * agreement hands it over, and sends a caller it refuses home.
 */
export const ApplicationDatesPage: FC = () => {
  const { plantId = "", sharingAgreementId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const fromObserved = isFromObserved(searchParams);

  const { agreement, plant, coefficientsData, isLoading, isNotFound, error } = useSharingAgreementDetailData(
    plantId,
    sharingAgreementId,
  );
  // The observation is read only when the dates start from it: from the
  // cache when the admin comes from observed sharing, fetched on a direct link.
  const observationRead = useSharingAgreementObservationData(plantId, fromObserved ? sharingAgreementId : "");
  const { actions, outcomes } = useSharingAgreementCoefficientActions(plantId).forAgreement(agreement);
  const { previewDates, setDates } = actions;

  const agreementPath = `/plants/${plantId}/sharing-agreements/${sharingAgreementId}`;
  const observationPath = agreementObservationPath(plantId, sharingAgreementId);

  const queryClient = useQueryClient();
  // The plant, the agreement and its coefficients all live under the plant's URL.
  const retryReads = () =>
    void queryClient.refetchQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === "string" && key.startsWith(`/api/v1/plants/${plantId}`);
      },
    });

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [plantId, sharingAgreementId]);

  if (outcomes.setDates.state === "denied") return <Navigate to="/" replace />;

  const isDraft = agreement?.status === SharingAgreementResponseStatus.DRAFT;
  // A plant or agreement that is not there, or an agreement whose
  // observation is answered 404, reads as not found.
  const notFound = isNotFound || (fromObserved && observationRead.isNotFound);

  let body: ReactNode;
  if (error) {
    body = (
      <Box sx={sxStyles.pageContainer}>
        <LoadErrorAlert message="Ha habido un problema al cargar el acuerdo de reparto." onRetry={retryReads} />
      </Box>
    );
  } else if (fromObserved && observationRead.error) {
    body = (
      <Box sx={sxStyles.pageContainer}>
        <LoadErrorAlert message="No se pudo cargar el reparto observado." onRetry={observationRead.refetch} />
      </Box>
    );
  } else if (isLoading || !agreement || !coefficientsData || (fromObserved && observationRead.isLoading) || !previewDates || !setDates) {
    body = <ObservationProgress />;
  } else if (isDraft) {
    body = (
      <Box sx={sxStyles.pageContainer}>
        <Notice severity="info">Este acuerdo es un borrador. Publícalo antes de fijar sus fechas de aplicación.</Notice>
      </Box>
    );
  } else {
    // An observation that is not computable, or an agreement it cannot
    // observe, gives no date to start from: the fields start empty.
    const observation = fromObserved && observationRead.observation?.analysis.computable ? observationRead.observation : undefined;
    body = (
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
        <ApplicationDatesFlow
          key={`${sharingAgreementId}:${fromObserved ? APPLICATION_DATES_FROM_OBSERVED : ""}`}
          agreement={agreement}
          coefficients={coefficientsData}
          observation={observation}
          previewDates={previewDates}
          setDates={setDates}
          agreementPath={agreementPath}
          observationPath={observationPath}
        />
      </LocalizationProvider>
    );
  }

  return (
    <Box sx={sxStyles.pageRoot}>
      <Box sx={{ ...sxStyles.pageContainer, pt: { xs: 2, sm: 0 } }}>
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: "Plantas", href: "/plants" },
            { label: plant?.name || "Planta", href: `/plants/${plantId}` },
            { label: "Acuerdos de reparto", href: `/plants/${plantId}/sharing-agreements` },
            { label: agreement?.name || "Acuerdo", href: agreementPath },
            { label: "Fijar fechas", href: "#" },
          ]}
        />
      </Box>

      {notFound ? (
        <Box sx={sxStyles.pageContainer}>
          <EmptyState
            icon={SearchOffIcon}
            title="Acuerdo no encontrado"
            subtitle="Este acuerdo de reparto no existe o no tienes acceso a su comunidad."
          />
        </Box>
      ) : (
        <>
          <Box sx={sxStyles.pageContainer}>
            <DetailHeader
              icon={<EditCalendarOutlinedIcon />}
              title="Fijar fechas de aplicación"
              status={agreement && <SharingAgreementStatusChip status={agreement.status} tone="onLight" />}
              subtitle={
                agreement ? (
                  <>
                    <Link component={RouterLink} to={agreementPath}>
                      {agreement.name}
                    </Link>
                    {plant?.name && ` · ${plant.name}`}
                  </>
                ) : undefined
              }
              isLoading={isLoading}
            />
          </Box>
          {body}
        </>
      )}
    </Box>
  );
};
