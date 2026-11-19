import { useEffect, useMemo, useState, type FC, type ReactNode } from "react";
import { Box, Button, Chip, Link, Typography } from "@mui/material";
import { Link as RouterLink, useLocation, useParams } from "react-router";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import {
  CoefficientObservationResponseStatus,
  type CoefficientObservationResponse,
  type LeavingObservationResponse,
  type SharingAgreementObservationResponse,
} from "../../../api/models";
import { BreadCrumb } from "../../../components/Breadcrumb";
import { DetailHeader } from "../../../components/DetailHeader";
import { EmptyState } from "../../../components/EmptyState";
import { ListTable } from "../../../components/ListTable";
import { LoadErrorAlert } from "../../../components/LoadErrorAlert";
import { Notice } from "../../../components/Notice";
import { RecordList, type RecordField } from "../../../components/RecordList";
import { ResponsiveRecordList } from "../../../components/ResponsiveRecordList";
import { SectionHeading } from "../../../components/SectionHeading";
import { SharingAgreementStatusChip } from "../../../components/SharingAgreementStatusChip";
import { sxStyles } from "../../../theme/sx";
import { colors } from "../../../theme/tokens";
import { supplyDisplayLabel } from "../../../utils/supplyDisplayLabel";
import { OBSERVED_SHARING_ICON } from "../plantDetail/sectionIcons";
import { groupBySupply } from "./anomalyGroups";
import { ObservationChip } from "./ObservationChip";
import { ObservationNotComputable } from "./ObservationNotComputable";
import { ObservationProgress } from "./ObservationProgress";
import { filterObservationRows, type ObservationFilter } from "./observationFilter";
import { ObservedAnomalies } from "./ObservedAnomalies";
import {
  ANOMALY_TYPE_LABEL,
  COEFFICIENT_STATUS_LABEL,
  LEAVING_STATUS_LABEL,
  STATUS_TONE,
  type ObservationTone,
} from "./observedSharingLabels";
import {
  betaMatches,
  formatAgreementApplication,
  formatBeta,
  formatDay,
  formatObservedDate,
  formatPercentageOrNone,
  formatRegisteredPeriod,
  NO_VALUE,
} from "./observedSharingFormat";
import { OBSERVED_ANOMALIES_ANCHOR, observedSharingPath } from "./observedSharingRoutes";
import { RecommendationList } from "./RecommendationList";
import { useSharingAgreementObservationData } from "./useSharingAgreementObservationData";

/** How many coefficient rows show before "Mostrar todos". */
const INITIAL_ROWS = 10;

/**
 * An observed β beside the registered one. Within ±0.1 percentage points it
 * counts as equal and reads plainly; beyond that, in the warning style
 * (UI-AGR-026). Only the backend's value is shown, never one computed here
 * (UI-AGR-031).
 */
const ObservedBeta: FC<{ observed: number | null; registered: number }> = ({ observed, registered }) => {
  const differs = observed !== null && !betaMatches(observed, registered);
  return (
    <Box component="span" sx={differs ? { color: colors.warning.main, fontWeight: 600 } : undefined}>
      {formatBeta(observed)}
    </Box>
  );
};

/**
 * When a row was observed applied, with its kind of date: observed, or, for a
 * row whose change cannot be observed, the agreement's date proposed in its
 * place, never presented as observed (UI-AGR-027).
 */
const RowDate: FC<{
  status: CoefficientObservationResponse["status"];
  observed: CoefficientObservationResponse["observedDate"];
  proposed: CoefficientObservationResponse["proposedDate"];
}> = ({ status, observed, proposed }) => {
  if (status === CoefficientObservationResponseStatus.NOT_DISTINGUISHABLE) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.5 }}>
        <Typography variant="body2" sx={{ color: colors.text.subtle }}>
          Mismo coeficiente que en el acuerdo anterior: no se puede observar el cambio
        </Typography>
        {proposed && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
            <span>{formatObservedDate(proposed)}</span>
            <ObservationChip label="Propuesta" tone="proposed" />
          </Box>
        )}
      </Box>
    );
  }
  if (!observed) return <>{NO_VALUE}</>;
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
      <span>{formatObservedDate(observed)}</span>
      <ObservationChip label="Observada" tone="observed" />
    </Box>
  );
};

/** A row's status, and the anomalies of this agreement on its supply. */
const RowStatus: FC<{ label: string; tone: ObservationTone; anomalyLabels: string[] }> = ({
  label,
  tone,
  anomalyLabels,
}) => (
  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.5 }}>
    <ObservationChip label={label} tone={tone} />
    {anomalyLabels.map((anomalyLabel) => (
      <Typography key={anomalyLabel} variant="body2" sx={{ color: colors.warning.main, fontWeight: 600 }}>
        {anomalyLabel}
      </Typography>
    ))}
  </Box>
);

const FilterChips: FC<{
  filter: ObservationFilter;
  onChange: (filter: ObservationFilter) => void;
  counts: Record<ObservationFilter, number>;
}> = ({ filter, onChange, counts }) => (
  <Box sx={{ display: "flex", gap: 1, overflowX: "auto", flexWrap: "nowrap", pb: 0.5, px: { xs: 2, sm: 0 }, pt: { xs: 2, sm: 0 } }}>
    {(["all", "warnings"] as const).map((value) => (
      <Chip
        key={value}
        label={`${value === "all" ? "Todos" : "Con avisos"} (${counts[value]})`}
        onClick={() => onChange(value)}
        aria-pressed={filter === value}
        color={filter === value ? "primary" : "default"}
        size="small"
        sx={{ flexShrink: 0 }}
      />
    ))}
  </Box>
);

const CoefficientRows: FC<{
  rows: CoefficientObservationResponse[];
  anomalyLabelsBySupply: Map<string, string[]>;
  header: ReactNode;
}> = ({ rows, anomalyLabelsBySupply, header }) => {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? rows : rows.slice(0, INITIAL_ROWS);
  const anomalyLabels = (row: CoefficientObservationResponse) => anomalyLabelsBySupply.get(row.supply.id) ?? [];
  const status = (row: CoefficientObservationResponse) => (
    <RowStatus label={COEFFICIENT_STATUS_LABEL[row.status]} tone={STATUS_TONE[row.status]} anomalyLabels={anomalyLabels(row)} />
  );
  const fields = (row: CoefficientObservationResponse): RecordField[] => [
    { label: "β registrado", value: formatBeta(row.coefficient) },
    { label: "β observado", value: <ObservedBeta observed={row.observedBeta} registered={row.coefficient} /> },
    { label: "Periodo registrado", value: formatRegisteredPeriod(row.storedValidFrom, row.storedValidTo) },
    {
      label: "Aplicación observada",
      value: <RowDate status={row.status} observed={row.observedDate} proposed={row.proposedDate} />,
    },
  ];

  return (
    <ResponsiveRecordList
      header={header}
      narrow={
        <RecordList
          label="Puntos de suministro del acuerdo"
          items={shown.map((row) => ({
            id: row.coefficientId,
            title: supplyDisplayLabel(row.supply),
            status: status(row),
            lines: [row.supply.code],
            fields: fields(row),
          }))}
        />
      }
      wide={
        <ListTable<CoefficientObservationResponse>
          rows={shown}
          getRowKey={(row) => row.coefficientId}
          isLoading={false}
          title={{
            header: "Punto de suministro",
            text: (row) => supplyDisplayLabel(row.supply),
            secondary: (row) => [row.supply.code],
            width: "20%",
          }}
          columns={[
            { key: "registered", header: "β registrado", render: (row) => formatBeta(row.coefficient), width: "11%" },
            {
              key: "observed",
              header: "β observado",
              render: (row) => <ObservedBeta observed={row.observedBeta} registered={row.coefficient} />,
              width: "11%",
            },
            {
              key: "period",
              header: "Periodo registrado",
              render: (row) => formatRegisteredPeriod(row.storedValidFrom, row.storedValidTo),
              width: "17%",
            },
            {
              key: "applied",
              header: "Aplicación observada",
              render: (row) => <RowDate status={row.status} observed={row.observedDate} proposed={row.proposedDate} />,
            },
            { key: "status", header: "Estado", render: status, width: "18%" },
          ]}
        />
      }
      footer={
        rows.length > INITIAL_ROWS && !showAll ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", px: 2, py: 1 }}>
            <Typography variant="body2" sx={{ color: colors.text.subtle }}>
              Mostrando {shown.length} de {rows.length} puntos ·
            </Typography>
            <Button size="small" onClick={() => setShowAll(true)}>
              Mostrar todos
            </Button>
          </Box>
        ) : undefined
      }
    />
  );
};

const LeavingRows: FC<{ rows: LeavingObservationResponse[] }> = ({ rows }) => {
  const status = (row: LeavingObservationResponse) => (
    <RowStatus label={LEAVING_STATUS_LABEL[row.status]} tone={STATUS_TONE[row.status]} anomalyLabels={[]} />
  );
  const leaving = (row: LeavingObservationResponse) => (
    <RowDate status={row.status} observed={row.observedLeavingDate} proposed={row.proposedDate} />
  );
  const registeredEnd = (row: LeavingObservationResponse) =>
    row.storedValidTo ? formatDay(row.storedValidTo) : "Sin fecha de fin";

  return (
    <ResponsiveRecordList
      narrow={
        <RecordList
          label="Puntos que salen del reparto"
          items={rows.map((row) => ({
            id: row.previousCoefficientId,
            title: supplyDisplayLabel(row.supply),
            status: status(row),
            lines: [row.supply.code],
            fields: [
              { label: "Acuerdo anterior", value: row.previousSharingAgreement.name },
              { label: "β anterior", value: formatBeta(row.previousCoefficient) },
              { label: "β observado", value: formatBeta(row.observedBeta) },
              { label: "Salida observada", value: leaving(row) },
              { label: "Fin registrado", value: registeredEnd(row) },
            ],
          }))}
        />
      }
      wide={
        <ListTable<LeavingObservationResponse>
          rows={rows}
          getRowKey={(row) => row.previousCoefficientId}
          isLoading={false}
          title={{
            header: "Suministro",
            text: (row) => supplyDisplayLabel(row.supply),
            secondary: (row) => [row.supply.code],
            width: "20%",
          }}
          columns={[
            { key: "previous", header: "Acuerdo anterior", render: (row) => row.previousSharingAgreement.name, width: "15%" },
            { key: "previousBeta", header: "β anterior", render: (row) => formatBeta(row.previousCoefficient), width: "11%" },
            { key: "observedBeta", header: "β observado", render: (row) => formatBeta(row.observedBeta), width: "11%" },
            { key: "leaving", header: "Salida observada", render: leaving },
            { key: "end", header: "Fin registrado", render: registeredEnd, width: "13%" },
            { key: "status", header: "Estado", render: status, width: "16%" },
          ]}
        />
      }
    />
  );
};

const ObservedState: FC<{ plantId: string; observation: SharingAgreementObservationResponse }> = ({ plantId, observation }) => {
  const { summary } = observation;
  const [filter, setFilter] = useState<ObservationFilter>("all");
  const all = useMemo(() => filterObservationRows(observation, "all"), [observation]);
  const warnings = useMemo(() => filterObservationRows(observation, "warnings"), [observation]);
  const shown = filter === "all" ? all : warnings;
  const anomalyGroups = useMemo(() => [{ supplies: groupBySupply(summary.anomalies), count: summary.anomalies.length }], [summary]);
  const anomalyLabelsBySupply = useMemo(() => {
    const labels = new Map<string, string[]>();
    for (const anomaly of summary.anomalies) {
      const supplyLabels = labels.get(anomaly.supply.id) ?? [];
      const label = ANOMALY_TYPE_LABEL[anomaly.type];
      if (!supplyLabels.includes(label)) labels.set(anomaly.supply.id, [...supplyLabels, label]);
    }
    return labels;
  }, [summary]);
  const anomalyCount = summary.anomalies.length;
  const hasRecommendations = summary.recommendations.length > 0;

  return (
    <>
      {hasRecommendations && (
        <Box component="section" aria-labelledby="observation-recommendations" sx={sxStyles.pageContainer}>
          <Box sx={sxStyles.softPanel}>
            <Typography id="observation-recommendations" variant="h6" component="h2" sx={{ fontWeight: 700, mb: 1.5 }}>
              Recomendaciones
            </Typography>
            <RecommendationList
              plantId={plantId}
              sharingAgreementId={summary.sharingAgreement.id}
              recommendations={summary.recommendations}
            />
          </Box>
        </Box>
      )}

      <Box component="section" aria-labelledby="observation-supplies" sx={sxStyles.pageContainer}>
        <SectionHeading
          headingId="observation-supplies"
          title="Por punto de suministro"
          description="β en % con 4 decimales. Una diferencia de ±0,1 puntos porcentuales o menos cuenta como igual."
        />
        <CoefficientRows
          rows={shown.coefficients}
          anomalyLabelsBySupply={anomalyLabelsBySupply}
          header={<FilterChips filter={filter} onChange={setFilter} counts={{ all: all.count, warnings: warnings.count }} />}
        />
      </Box>

      {shown.leavingRows.length > 0 && (
        <Box component="section" aria-labelledby="observation-leaving" sx={sxStyles.pageContainer}>
          <SectionHeading
            headingId="observation-leaving"
            title={`Salen del reparto (${shown.leavingRows.length})`}
            description="Tenían coeficiente en el acuerdo anterior y no están en este. La salida observada es lo que muestra Datadis."
          />
          <LeavingRows rows={shown.leavingRows} />
        </Box>
      )}

      <Box component="section" aria-labelledby={OBSERVED_ANOMALIES_ANCHOR} sx={sxStyles.pageContainer}>
        <Box sx={sxStyles.softPanel}>
          <Typography
            id={OBSERVED_ANOMALIES_ANCHOR}
            tabIndex={-1}
            variant="h6"
            component="h2"
            sx={{ fontWeight: 700, mb: 1.5, scrollMarginTop: (theme) => theme.spacing(10), "&:focus:not(:focus-visible)": { outline: "none" } }}
          >
            {anomalyCount > 0 ? `Anomalías de este acuerdo (${anomalyCount})` : "Anomalías de este acuerdo"}
          </Typography>
          {anomalyCount > 0 ? (
            <ObservedAnomalies groups={anomalyGroups} showAgreements={false} defaultExpanded />
          ) : (
            <Typography sx={{ color: colors.text.body }}>Sin anomalías</Typography>
          )}
        </Box>
      </Box>
    </>
  );
};

/**
 * One agreement's observed sharing (#418): each of its supplies' registered
 * and observed β and dates, the supplies that left the distribution with it,
 * and its anomalies. Read only: the registered agreement stays the reference.
 */
export const SharingAgreementObservationPage: FC = () => {
  const { plantId = "", sharingAgreementId = "" } = useParams();
  const { hash } = useLocation();
  const { plant, observation, isLoading, isNotFound, notObservableMessage, error, refetch } =
    useSharingAgreementObservationData(plantId, sharingAgreementId);
  const summary = observation?.summary;
  const agreementPath = `/plants/${plantId}/sharing-agreements/${sharingAgreementId}`;

  // "Revisar anomalías" leads here, to the anomalies: once they are on screen,
  // bring them into view and move focus to their heading.
  const hasObservation = observation !== undefined;
  useEffect(() => {
    if (!hasObservation || hash !== `#${OBSERVED_ANOMALIES_ANCHOR}`) return;
    const heading = document.getElementById(OBSERVED_ANOMALIES_ANCHOR);
    heading?.scrollIntoView({ block: "start" });
    heading?.focus({ preventScroll: true });
  }, [hasObservation, hash]);

  let body: ReactNode;
  if (notObservableMessage !== undefined) {
    body = (
      <Box sx={sxStyles.pageContainer}>
        <Notice severity="info">{notObservableMessage}</Notice>
      </Box>
    );
  } else if (error) {
    body = (
      <Box sx={sxStyles.pageContainer}>
        <LoadErrorAlert message="No se pudo cargar el reparto observado." onRetry={refetch} />
      </Box>
    );
  } else if (isLoading || !plant || !observation) {
    body = <ObservationProgress />;
  } else if (!observation.analysis.computable) {
    body = <ObservationNotComputable plant={plant} />;
  } else {
    body = <ObservedState plantId={plantId} observation={observation} />;
  }

  const suppliesWithoutData = observation?.analysis.suppliesWithoutValidDays.length ?? 0;
  const unallocated = summary?.unallocatedShare;

  return (
    <Box sx={sxStyles.pageRoot}>
      <Box sx={{ ...sxStyles.pageContainer, pt: { xs: 2, sm: 0 } }}>
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: "Plantas", href: "/plants" },
            { label: plant?.name || "Planta", href: `/plants/${plantId}` },
            { label: "Acuerdos de reparto", href: `/plants/${plantId}/sharing-agreements` },
            { label: "Reparto observado", href: observedSharingPath(plantId) },
            { label: summary?.sharingAgreement.name || "Acuerdo", href: "#" },
          ]}
        />
      </Box>

      {isNotFound ? (
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
              icon={<OBSERVED_SHARING_ICON />}
              title={summary ? `${summary.sharingAgreement.name} según Datadis` : "Reparto observado"}
              subtitle={
                <>
                  <Link component={RouterLink} to={observedSharingPath(plantId)}>
                    Reparto observado
                  </Link>
                  {" · "}
                  <Link component={RouterLink} to={agreementPath}>
                    Ver el acuerdo
                  </Link>
                  {plant && (
                    <>
                      {" · "}
                      <Link component={RouterLink} to={`/plants/${plantId}`}>
                        {plant.name}
                      </Link>
                    </>
                  )}
                </>
              }
              status={summary && <SharingAgreementStatusChip status={summary.sharingAgreement.status} />}
              isLoading={isLoading}
              keyFacts={
                summary && observation.analysis.computable
                  ? [
                      {
                        label: "Fichero enviado",
                        shortLabel: "Enviado",
                        value: summary.distributorFileSentOn ? formatDay(summary.distributorFileSentOn) : "Sin registrar",
                      },
                      { label: "Aplicación", value: formatAgreementApplication(summary) },
                      { label: "Anomalías", value: String(summary.anomalies.length) },
                    ]
                  : undefined
              }
              details={
                summary && observation.analysis.computable
                  ? [
                      {
                        label: "Sin explicar (1 − Σβ)",
                        value:
                          unallocated && unallocated.registeredShareWithoutData > 0 && suppliesWithoutData > 0
                            ? `${formatPercentageOrNone(unallocated.unallocated, 1)} · ${formatPercentageOrNone(unallocated.registeredShareWithoutData, 1)} es ${suppliesWithoutData === 1 ? "del punto sin datos" : `de los ${suppliesWithoutData} puntos sin datos`}`
                            : formatPercentageOrNone(unallocated?.unallocated, 1),
                      },
                    ]
                  : undefined
              }
            />
          </Box>
          {body}
        </>
      )}
    </Box>
  );
};
