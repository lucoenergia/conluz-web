import { useMemo, type FC, type ReactNode } from "react";
import { Box, Link, Skeleton, Typography } from "@mui/material";
import { Link as RouterLink, useParams } from "react-router";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { BreadCrumb } from "../../../components/Breadcrumb";
import { DetailHeader, type DetailFact, type DetailKeyFacts } from "../../../components/DetailHeader";
import { EmptyState } from "../../../components/EmptyState";
import { ListTable } from "../../../components/ListTable";
import { LoadErrorAlert } from "../../../components/LoadErrorAlert";
import { Notice } from "../../../components/Notice";
import { RecordList } from "../../../components/RecordList";
import { ResponsiveRecordList } from "../../../components/ResponsiveRecordList";
import { SectionHeading } from "../../../components/SectionHeading";
import { sxStyles } from "../../../theme/sx";
import { colors } from "../../../theme/tokens";
import { supplyDisplayLabel } from "../../../utils/supplyDisplayLabel";
import { OBSERVED_SHARING_ICON } from "../plantDetail/sectionIcons";
import { groupAnomalies } from "./anomalyGroups";
import { ObservationChip } from "./ObservationChip";
import { ObservedAgreementCard } from "./ObservedAgreementCard";
import { ObservedAnomalies } from "./ObservedAnomalies";
import { ObservationNotComputable } from "./ObservationNotComputable";
import { ObservationProgress } from "./ObservationProgress";
import { actionableRecommendations } from "./observedSharingLabels";
import { formatDataRange, formatDataRangeInSentence, joinNames, NO_VALUE } from "./observedSharingFormat";
import type { PlantSharingObservation } from "./pendingObservationFields";
import { usePlantSharingObservationData } from "./usePlantSharingObservationData";

const READ_ONLY_NOTE = "Solo lectura: compara lo que muestra Datadis con lo registrado. No cambia ningún dato.";

const panelSx = { ...sxStyles.softPanel, display: "flex", flexDirection: "column", gap: 2 } as const;

/** What the page's header says about the analysis, once it is known. */
function headerFacts(observation: PlantSharingObservation): { keyFacts: DetailKeyFacts; details: DetailFact[] } {
  const { analysis, sharingAgreements, unattributedAnomalies } = observation;
  const withData = analysis.suppliesWithValidDays.length;
  const analysed = withData + analysis.suppliesWithoutValidDays.length;
  const anomalies = sharingAgreements.reduce((sum, summary) => sum + summary.anomalies.length, unattributedAnomalies.length);
  const toReview = sharingAgreements.filter((summary) => actionableRecommendations(summary.recommendations).length > 0).length;
  const computable = analysis.computable && analysis.analysedFrom !== null && analysis.analysedTo !== null;

  return {
    keyFacts: [
      {
        label: "Periodo analizado",
        shortLabel: "Periodo",
        value: computable ? formatDataRange(analysis.analysedFrom!, analysis.analysedTo!) : NO_VALUE,
      },
      { label: "Puntos con datos", shortLabel: "Con datos", value: `${withData} de ${analysed}` },
      { label: "Anomalías", value: computable ? String(anomalies) : NO_VALUE },
    ],
    details: computable ? [{ label: "Acuerdos por revisar", value: `${toReview} de ${sharingAgreements.length}` }] : [],
  };
}

/** Whether the analysis found nothing to look at: no agreement to review and no anomaly. */
function isAllClear(observation: PlantSharingObservation): boolean {
  return (
    observation.unattributedAnomalies.length === 0 &&
    observation.sharingAgreements.every(
      (summary) => summary.anomalies.length === 0 && actionableRecommendations(summary.recommendations).length === 0,
    )
  );
}

/** The data the analysis rests on, the supplies without any, and, when it found nothing to look at, so. */
const AnalysisNotice: FC<{ observation: PlantSharingObservation }> = ({ observation }) => {
  const { analysis } = observation;
  const withoutData = analysis.suppliesWithoutValidDays.map((supply) => supplyDisplayLabel(supply));
  return (
    <Notice severity={isAllClear(observation) ? "success" : "info"}>
      {`Datos de Datadis ${formatDataRangeInSentence(analysis.analysedFrom!, analysis.analysedTo!)}.`}
      {withoutData.length > 0 &&
        ` ${withoutData.length} ${withoutData.length === 1 ? "punto sin datos" : "puntos sin datos"} de Datadis: ${joinNames(withoutData)}. Su parte aparece como «sin explicar».`}
      {isAllClear(observation) &&
        " Todo aplicado, sin anomalías. Datadis muestra cada acuerdo aplicado desde su fecha registrada y todos los puntos reciben su coeficiente."}
    </Notice>
  );
};

/** While the analysis computes: its progress, and the agreements' places held. */
const LoadingState: FC = () => (
  <>
    <ObservationProgress />
    <Box sx={sxStyles.pageContainer}>
      <Box sx={panelSx}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
          Acuerdos
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
          {[0, 1].map((index) => (
            <Skeleton key={index} variant="rounded" height={240} />
          ))}
        </Box>
      </Box>
    </Box>
  </>
);

/** Supplies holding coefficients in this plant and in another: not analysed, and no reason is given (UI-AGR-028). */
const NotComputableSupplies: FC<{ observation: PlantSharingObservation }> = ({ observation }) => {
  const supplies = observation.analysis.notComputableSupplies;
  if (supplies.length === 0) return null;
  const status = <ObservationChip label="No calculable" tone="neutral" />;
  return (
    <Box component="section" aria-labelledby="observed-not-computable" sx={sxStyles.pageContainer}>
      <Typography id="observed-not-computable" variant="h6" component="h2" sx={{ fontWeight: 700, mb: 1.5 }}>
        No calculables
      </Typography>
      <ResponsiveRecordList
        narrow={
          <RecordList
            label="Puntos no calculables"
            items={supplies.map((supply) => ({
              id: supply.id,
              title: supplyDisplayLabel(supply),
              status,
              lines: [supply.code],
            }))}
          />
        }
        wide={
          <ListTable
            rows={supplies}
            getRowKey={(supply) => supply.id}
            isLoading={false}
            title={{ header: "Punto de suministro", text: (supply) => supplyDisplayLabel(supply) }}
            columns={[
              { key: "code", header: "CUPS", render: (supply) => supply.code },
              { key: "status", header: "Estado", render: () => status, width: "180px" },
            ]}
          />
        }
      />
    </Box>
  );
};

const AnalysedState: FC<{ plantId: string; observation: PlantSharingObservation }> = ({ plantId, observation }) => {
  const groups = useMemo(
    () => groupAnomalies(observation.sharingAgreements, observation.unattributedAnomalies),
    [observation],
  );
  const anomalyCount = groups.reduce((sum, group) => sum + group.count, 0);
  const allClear = isAllClear(observation);
  const suppliesWithoutDataCount = observation.analysis.suppliesWithoutValidDays.length;

  return (
    <>
      <Box sx={sxStyles.pageContainer}>
        <AnalysisNotice observation={observation} />
      </Box>

      <Box component="section" aria-labelledby="observed-agreements" sx={sxStyles.pageContainer}>
        <Box sx={sxStyles.softPanel}>
          <SectionHeading
            headingId="observed-agreements"
            title="Acuerdos"
            description={
              allClear
                ? "Desde cuándo se aplica cada acuerdo registrado según Datadis."
                : "El acuerdo registrado es la referencia. Datadis solo indica desde cuándo se aplica cada coeficiente y si hay anomalías. Nada cambia hasta que tú lo confirmes."
            }
          />
          {/* In the order the analysis returned them (UI-AGR-023). */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
            {observation.sharingAgreements.map((summary) => (
              <ObservedAgreementCard
                key={summary.sharingAgreement.id}
                plantId={plantId}
                summary={summary}
                suppliesWithoutDataCount={suppliesWithoutDataCount}
              />
            ))}
          </Box>
        </Box>
      </Box>

      <Box component="section" aria-labelledby="observed-anomalies" sx={sxStyles.pageContainer}>
        <Box sx={sxStyles.softPanel}>
          <SectionHeading
            headingId="observed-anomalies"
            title={anomalyCount > 0 ? `Anomalías (${anomalyCount})` : "Anomalías"}
            description={
              anomalyCount > 0
                ? "Agrupadas por acuerdo y punto de suministro. Cada fila es un periodo continuo, del primer al último día. Conluz no propone coeficientes: revisa el acuerdo o el fichero enviado."
                : "Cambios sostenidos que no corresponden al siguiente coeficiente registrado de un punto."
            }
          />
          {anomalyCount > 0 ? (
            <ObservedAnomalies groups={groups} showAgreements defaultExpanded={false} />
          ) : (
            <Typography sx={{ color: colors.text.body }}>Sin anomalías</Typography>
          )}
        </Box>
      </Box>

      <NotComputableSupplies observation={observation} />
    </>
  );
};

/**
 * A plant's observed sharing (#418): when the distributor applied each of its
 * agreements according to Datadis, and what it applied that the agreements
 * do not explain. Read only: the registered agreement stays the reference.
 */
export const PlantObservedSharingPage: FC = () => {
  const { plantId = "" } = useParams();
  const { plant, observation, isLoading, isNotFound, error, refetch } = usePlantSharingObservationData(plantId);
  const facts = observation && headerFacts(observation);

  let body: ReactNode;
  if (error) {
    body = (
      <Box sx={sxStyles.pageContainer}>
        <LoadErrorAlert message="No se pudo cargar el reparto observado." onRetry={refetch} />
      </Box>
    );
  } else if (isLoading || !plant || !observation) {
    body = <LoadingState />;
  } else if (!observation.analysis.computable) {
    body = <ObservationNotComputable plant={plant} />;
  } else {
    body = <AnalysedState plantId={plantId} observation={observation} />;
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
            { label: "Reparto observado", href: "#" },
          ]}
        />
      </Box>

      {isNotFound ? (
        <Box sx={sxStyles.pageContainer}>
          <EmptyState
            icon={SearchOffIcon}
            title="Planta no encontrada"
            subtitle="Esta planta no existe o no tienes acceso a su comunidad."
          />
        </Box>
      ) : (
        <>
          <Box sx={sxStyles.pageContainer}>
            <DetailHeader
              icon={<OBSERVED_SHARING_ICON />}
              title="Reparto observado"
              subtitle={
                <>
                  {plant && (
                    <>
                      <Link component={RouterLink} to={`/plants/${plantId}`}>
                        {plant.name}
                      </Link>
                      {" · "}
                    </>
                  )}
                  {READ_ONLY_NOTE}
                </>
              }
              isLoading={isLoading}
              keyFacts={facts?.keyFacts}
              details={facts?.details}
            />
          </Box>
          {body}
        </>
      )}
    </Box>
  );
};
