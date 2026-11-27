import { useEffect, useMemo, useState, type FC, type ReactNode } from "react";
import { Box, Button, Link, Typography } from "@mui/material";
import { Link as RouterLink, useLocation, useParams } from "react-router";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import {
  CoefficientObservationResponseStatus,
  type CoefficientObservationResponse,
  type LeavingObservationResponse,
  type ObservationStatusCountsResponse,
  type PlantResponse,
  type SharingAgreementObservationResponse,
} from "../../../api/models";
import { BreadCrumb } from "../../../components/Breadcrumb";
import { DetailHeader } from "../../../components/DetailHeader";
import { EmptyState } from "../../../components/EmptyState";
import { ListFilters } from "../../../components/ListFilters";
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
import { agreementClaimSource, claimableAnomalies } from "./claimText";
import { ClaimTextDialog } from "./ClaimTextDialog";
import { ObservationChip } from "./ObservationChip";
import { ObservationNotComputable } from "./ObservationNotComputable";
import { ObservationProgress } from "./ObservationProgress";
import { filterObservationRows, isStatusFilter, type ObservationFilter } from "./observationFilter";
import { ObservedAnomalies } from "./ObservedAnomalies";
import { ObservedSharingHelp } from "./ObservedSharingHelp";
import {
  ANOMALY_TYPE_LABEL,
  COEFFICIENT_STATUS_LABEL,
  LEAVES_DISTRIBUTION_LABEL,
  LEAVING_REASON,
  LEAVING_STATUS_LABEL,
  STATUS_COUNT_ORDER,
  STATUS_TONE,
  UNATTRIBUTED_PRODUCTION_LABEL,
  type ObservationTone,
} from "./observedSharingLabels";
import {
  betaMatches,
  formatAgreementApplication,
  formatBeta,
  formatDay,
  formatMeasurableDays,
  formatObservedDate,
  formatRegisteredPeriod,
  NO_VALUE,
} from "./observedSharingFormat";
import { OBSERVED_ANOMALIES_ANCHOR, observedSharingPath } from "./observedSharingRoutes";
import { RecommendationFindings } from "./RecommendationFindings";
import { recommendationFindings } from "./recommendationFindings";
import { UnattributedProduction } from "./UnattributedProduction";
import { useSharingAgreementObservationData } from "./useSharingAgreementObservationData";

/** How many coefficient rows the agreement counts in a status; 0 for a status it does not count. */
const statusCount = (counts: ObservationStatusCountsResponse, status: CoefficientObservationResponse["status"]): number => {
  const field = STATUS_COUNT_ORDER.find((entry) => entry.status === status)?.count;
  return field === undefined ? 0 : counts[field];
};

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
          Mismo coeficiente que en el acuerdo anterior: en Datadis no se ve cuándo cambió.
        </Typography>
        {proposed ? (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
              <span>{formatObservedDate(proposed)}</span>
              <ObservationChip label="Propuesta" tone="proposed" />
            </Box>
            <Typography variant="body2" sx={{ color: colors.text.subtle }}>
              Propuesta: es la fecha de aplicación más frecuente entre los demás puntos de este acuerdo.
            </Typography>
          </>
        ) : (
          <Typography variant="body2" sx={{ color: colors.text.subtle }}>
            Sin fecha propuesta: ningún otro punto de este acuerdo tiene fecha observada.
          </Typography>
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

/**
 * A row's status, the anomalies of this agreement on its supply, and, for a
 * coefficient the backend flags as leaving the distribution, that mark.
 */
const RowStatus: FC<{ label: string; tone: ObservationTone; anomalyLabels: string[]; leaves?: boolean }> = ({
  label,
  tone,
  anomalyLabels,
  leaves = false,
}) => (
  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.5 }}>
    <ObservationChip label={label} tone={tone} />
    {leaves && <ObservationChip label={LEAVES_DISTRIBUTION_LABEL} tone="neutral" />}
    {anomalyLabels.map((anomalyLabel) => (
      <Typography key={anomalyLabel} variant="body2" sx={{ color: colors.warning.main, fontWeight: 600 }}>
        {anomalyLabel}
      </Typography>
    ))}
  </Box>
);

/** "1 punto", "N puntos". */
const pointsCount = (count: number) => (count === 1 ? "1 punto" : `${count} puntos`);

/**
 * The supply rows' filter, as the members page filters (UI-AGR-045): "Todos"
 * and "Con avisos" with the rows they keep, then each status the agreement
 * counts at least one row in, with that count, in the card's order.
 */
const RowFilter: FC<{
  filter: ObservationFilter;
  onChange: (filter: ObservationFilter) => void;
  counts: { all: number; warnings: number };
  statusCounts: ObservationStatusCountsResponse;
  shownCount: number;
}> = ({ filter, onChange, counts, statusCounts, shownCount }) => (
  <Box sx={{ p: 2 }}>
    <ListFilters
      filters={[
        {
          key: "status",
          label: "Estado",
          value: filter,
          options: [
            { value: "all", label: `Todos (${counts.all})` },
            { value: "warnings", label: `Con avisos (${counts.warnings})` },
            ...STATUS_COUNT_ORDER.filter(({ count }) => statusCounts[count] > 0).map(({ status, count }) => ({
              value: status,
              label: `${COEFFICIENT_STATUS_LABEL[status]} (${statusCounts[count]})`,
            })),
          ],
          onChange: (value) => onChange(value as ObservationFilter),
          width: 320,
        },
      ]}
      resultLabel={`Ver ${pointsCount(shownCount)}`}
    />
  </Box>
);

type MeasurableDaysRow = Parameters<typeof formatMeasurableDays>[0] & { windowFrom: string | null; windowTo: string | null };

/**
 * A row's measurable days, "N de M", with the days of its window under them
 * when it has one; nothing for a row that cannot be observed (UI-AGR-042).
 */
const measurableDays = (row: MeasurableDaysRow): ReactNode => {
  const days = formatMeasurableDays(row);
  if (days === null) return null;
  const { windowFrom: from, windowTo: to } = row;
  return (
    <>
      {days}
      {from !== null && to !== null && (
        // "del 04/03/2025 al 31/10/2026": the column wraps it before "al", never inside a date.
        <Typography component="span" variant="body2" sx={{ display: "block", color: colors.text.subtle }}>
          <Box component="span" sx={{ whiteSpace: "nowrap" }}>del {formatDay(from)}</Box>{" "}
          <Box component="span" sx={{ whiteSpace: "nowrap" }}>al {formatDay(to)}</Box>
        </Typography>
      )}
    </>
  );
};

/** A stacked row's measurable days, left out for a row that cannot be observed (UI-AGR-042). */
const measurableDaysField = (row: MeasurableDaysRow): RecordField[] =>
  formatMeasurableDays(row) === null ? [] : [{ label: "Días medibles de su periodo", value: measurableDays(row) }];

const CoefficientRows: FC<{
  rows: CoefficientObservationResponse[];
  anomalyLabelsBySupply: Map<string, string[]>;
  header: ReactNode;
  showAll: boolean;
  onShowAll: () => void;
}> = ({ rows, anomalyLabelsBySupply, header, showAll, onShowAll }) => {
  const shown = showAll ? rows : rows.slice(0, INITIAL_ROWS);
  const anomalyLabels = (row: CoefficientObservationResponse) => anomalyLabelsBySupply.get(row.supply.id) ?? [];
  const status = (row: CoefficientObservationResponse) => (
    <RowStatus
      label={COEFFICIENT_STATUS_LABEL[row.status]}
      tone={STATUS_TONE[row.status]}
      anomalyLabels={anomalyLabels(row)}
      leaves={row.leavesDistribution}
    />
  );
  const fields = (row: CoefficientObservationResponse): RecordField[] => [
    { label: "β registrada", value: formatBeta(row.coefficient) },
    { label: "β observada", value: <ObservedBeta observed={row.observedBeta} registered={row.coefficient} /> },
    ...measurableDaysField(row),
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
            { key: "registered", header: "β registrada", render: (row) => formatBeta(row.coefficient), width: "10%" },
            {
              key: "observed",
              header: "β observada",
              render: (row) => <ObservedBeta observed={row.observedBeta} registered={row.coefficient} />,
              width: "11%",
            },
            {
              key: "measurableDays",
              header: "Días medibles",
              render: measurableDays,
              width: "13%",
            },
            {
              key: "period",
              header: "Periodo registrado",
              render: (row) => formatRegisteredPeriod(row.storedValidFrom, row.storedValidTo),
              width: "13%",
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
            <Button size="small" onClick={onShowAll}>
              Mostrar todos
            </Button>
          </Box>
        ) : undefined
      }
    />
  );
};

/**
 * A supply that leaves the distribution with the agreement: absent from it
 * (a leaving row), or holding a coefficient the backend flags as dropping to
 * 0 % (`leavesDistribution`), which also stays among the coefficient rows.
 */
type LeavingSectionRow =
  | { kind: "absent"; row: LeavingObservationResponse }
  | { kind: "zero"; row: CoefficientObservationResponse };

const leavingSectionRows = (
  leavingRows: LeavingObservationResponse[],
  coefficients: CoefficientObservationResponse[],
): LeavingSectionRow[] => [
  ...leavingRows.map((row) => ({ kind: "absent" as const, row })),
  ...coefficients.filter((row) => row.leavesDistribution).map((row) => ({ kind: "zero" as const, row })),
];

const LeavingRows: FC<{ rows: LeavingSectionRow[] }> = ({ rows }) => {
  const key = (item: LeavingSectionRow) => (item.kind === "absent" ? item.row.previousCoefficientId : item.row.coefficientId);
  const status = (item: LeavingSectionRow) =>
    item.kind === "absent" ? (
      <RowStatus label={LEAVING_STATUS_LABEL[item.row.status]} tone={STATUS_TONE[item.row.status]} anomalyLabels={[]} />
    ) : (
      <RowStatus label={COEFFICIENT_STATUS_LABEL[item.row.status]} tone={STATUS_TONE[item.row.status]} anomalyLabels={[]} />
    );
  const leaving = (item: LeavingSectionRow) =>
    item.kind === "absent" ? (
      <RowDate status={item.row.status} observed={item.row.observedLeavingDate} proposed={item.row.proposedDate} />
    ) : (
      <RowDate status={item.row.status} observed={item.row.observedDate} proposed={item.row.proposedDate} />
    );
  const registeredEnd = (row: LeavingObservationResponse) =>
    row.storedValidTo ? formatDay(row.storedValidTo) : "Sin fecha de fin";
  // A β never breaks inside its figure ("4,0000 %") in the table's narrow columns.
  const beta = (value: ReactNode) => (
    <Box component="span" sx={{ whiteSpace: "nowrap" }}>
      {value}
    </Box>
  );
  // In the table, an absent supply's leaving carries its registered end under
  // it, and its reason names the agreement it leaves, so neither needs a
  // column of its own: two kinds of row share one table.
  const leavingWithEnd = (item: LeavingSectionRow) => (
    <>
      {leaving(item)}
      {item.kind === "absent" && (
        <Typography variant="body2" sx={{ mt: 0.5, color: colors.text.subtle }}>
          Fin registrado: {item.row.storedValidTo ? formatDay(item.row.storedValidTo) : "sin fecha de fin"}
        </Typography>
      )}
    </>
  );
  const reason = (item: LeavingSectionRow) =>
    item.kind === "absent" ? (
      <>
        {LEAVING_REASON.absent}
        <Typography component="span" variant="body2" sx={{ display: "block", color: colors.text.subtle }}>
          Acuerdo anterior: {item.row.previousSharingAgreement.name}
        </Typography>
      </>
    ) : (
      LEAVING_REASON.zero
    );
  const fields = (item: LeavingSectionRow): RecordField[] =>
    item.kind === "absent"
      ? [
          { label: "Motivo", value: LEAVING_REASON.absent },
          { label: "Acuerdo anterior", value: item.row.previousSharingAgreement.name },
          { label: "β anterior", value: formatBeta(item.row.previousCoefficient) },
          { label: "β observada", value: formatBeta(item.row.observedBeta) },
          ...measurableDaysField(item.row),
          { label: "Salida observada", value: leaving(item) },
          { label: "Fin registrado", value: registeredEnd(item.row) },
        ]
      : [
          { label: "Motivo", value: LEAVING_REASON.zero },
          { label: "β registrada", value: formatBeta(item.row.coefficient) },
          { label: "β observada", value: <ObservedBeta observed={item.row.observedBeta} registered={item.row.coefficient} /> },
          ...measurableDaysField(item.row),
          { label: "Salida observada", value: leaving(item) },
        ];

  return (
    <ResponsiveRecordList
      narrow={
        <RecordList
          label="Puntos que salen del reparto"
          items={rows.map((item) => ({
            id: key(item),
            title: supplyDisplayLabel(item.row.supply),
            status: status(item),
            lines: [item.row.supply.code],
            fields: fields(item),
          }))}
        />
      }
      wide={
        <ListTable<LeavingSectionRow>
          rows={rows}
          getRowKey={key}
          isLoading={false}
          title={{
            header: "Suministro",
            text: (item) => supplyDisplayLabel(item.row.supply),
            secondary: (item) => [item.row.supply.code],
            width: "19%",
          }}
          columns={[
            { key: "reason", header: "Motivo", render: reason, width: "12%" },
            {
              key: "previousBeta",
              header: "β anterior",
              render: (item) => (item.kind === "absent" ? beta(formatBeta(item.row.previousCoefficient)) : NO_VALUE),
              width: "8%",
            },
            {
              key: "registeredBeta",
              header: "β registrada",
              render: (item) => (item.kind === "zero" ? beta(formatBeta(item.row.coefficient)) : NO_VALUE),
              width: "8%",
            },
            {
              key: "observedBeta",
              header: "β observada",
              render: (item) =>
                beta(
                  item.kind === "absent" ? (
                    formatBeta(item.row.observedBeta)
                  ) : (
                    <ObservedBeta observed={item.row.observedBeta} registered={item.row.coefficient} />
                  ),
                ),
              width: "8%",
            },
            { key: "measurableDays", header: "Días medibles", render: (item) => measurableDays(item.row), width: "13%" },
            { key: "leaving", header: "Salida observada", render: leavingWithEnd },
            { key: "status", header: "Estado", render: status, width: "19%" },
          ]}
        />
      }
    />
  );
};

const ObservedState: FC<{
  plantId: string;
  plant: Pick<PlantResponse, "regulatoryCode">;
  observation: SharingAgreementObservationResponse;
}> = ({ plantId, plant, observation }) => {
  const { summary } = observation;
  const [selectedFilter, setFilter] = useState<ObservationFilter>("all");
  const [showAll, setShowAll] = useState(false);
  // A refetch can leave the selected status with no row, and its option gone:
  // the filter then reads "Todos", never an empty table (UI-AGR-045).
  const filter =
    isStatusFilter(selectedFilter) && !(statusCount(summary.coefficientStatusCounts, selectedFilter) > 0)
      ? "all"
      : selectedFilter;
  const all = useMemo(() => filterObservationRows(observation, "all"), [observation]);
  const warnings = useMemo(() => filterObservationRows(observation, "warnings"), [observation]);
  const shown = useMemo(
    () => (filter === "all" ? all : filter === "warnings" ? warnings : filterObservationRows(observation, filter)),
    [filter, all, warnings, observation],
  );
  const changeFilter = (next: ObservationFilter) => {
    // Picking or leaving a status starts over from the first rows; "Todos" and "Con avisos" keep what is shown.
    if (isStatusFilter(filter) || isStatusFilter(next)) setShowAll(false);
    setFilter(next);
  };
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
  // This agreement's anomalies alone, offered only when one is claimable
  // (UI-AGR-046); this state is a computable analysis.
  const claimSource = useMemo(() => agreementClaimSource(observation), [observation]);
  const hasClaim = useMemo(() => claimableAnomalies(claimSource).length > 0, [claimSource]);
  const findings = recommendationFindings(plantId, summary);
  // A status filters the supply rows alone: the leaving ones show as under "Todos" (UI-AGR-045).
  const leavingSource = isStatusFilter(filter) ? all : shown;
  const leavingRows = leavingSectionRows(leavingSource.leavingRows, leavingSource.coefficients);

  return (
    <>
      {findings.length > 0 && (
        <Box component="section" aria-labelledby="observation-recommendations" sx={sxStyles.pageContainer}>
          <Box sx={sxStyles.softPanel}>
            <Typography id="observation-recommendations" variant="h6" component="h2" sx={{ fontWeight: 700, mb: 1.5 }}>
              Qué revisar
            </Typography>
            <RecommendationFindings findings={findings} />
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
          showAll={showAll}
          onShowAll={() => setShowAll(true)}
          header={
            <RowFilter
              filter={filter}
              onChange={changeFilter}
              counts={{ all: all.count, warnings: warnings.count }}
              statusCounts={summary.coefficientStatusCounts}
              shownCount={shown.coefficients.length}
            />
          }
        />
      </Box>

      {leavingRows.length > 0 && (
        <Box component="section" aria-labelledby="observation-leaving" sx={sxStyles.pageContainer}>
          <SectionHeading
            headingId="observation-leaving"
            title={`Salen del reparto (${leavingRows.length})`}
            description="Tenían coeficiente en el acuerdo anterior y no están en este, o pasan a 0 %. La salida observada es lo que muestra Datadis."
          />
          <LeavingRows rows={leavingRows} />
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
          {hasClaim && (
            <Box sx={{ mb: 2 }}>
              <ClaimTextDialog source={claimSource} plant={plant} />
            </Box>
          )}
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
    body = <ObservedState plantId={plantId} plant={plant} observation={observation} />;
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
              actions={<ObservedSharingHelp />}
              isLoading={isLoading}
              wrapFactValues
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
                        label: UNATTRIBUTED_PRODUCTION_LABEL,
                        value: <UnattributedProduction share={summary.unallocatedShare} variant="body2" />,
                        // Its explanation and breakdown read as sentences, not in a quarter column.
                        wide: true,
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
