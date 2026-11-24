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
import { ObservedSharingHelp } from "./ObservedSharingHelp";
import {
  ANOMALY_TYPE_LABEL,
  COEFFICIENT_STATUS_LABEL,
  LEAVES_DISTRIBUTION_LABEL,
  LEAVING_REASON,
  LEAVING_STATUS_LABEL,
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

const FilterChips: FC<{
  filter: ObservationFilter;
  onChange: (filter: ObservationFilter) => void;
  counts: Record<ObservationFilter, number>;
}> = ({ filter, onChange, counts }) => (
  <Box sx={{ display: "flex", gap: 1, overflowX: "auto", flexWrap: "nowrap", pb: 0.5, px: 2, pt: 2 }}>
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
}> = ({ rows, anomalyLabelsBySupply, header }) => {
  const [showAll, setShowAll] = useState(false);
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
            <Button size="small" onClick={() => setShowAll(true)}>
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
  // In the table, an absent supply's reason names the agreement it leaves, so
  // the row needs no column of its own for it.
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
            width: "15%",
          }}
          columns={[
            { key: "reason", header: "Motivo", render: reason, width: "14%" },
            {
              key: "previousBeta",
              header: "β anterior",
              render: (item) => (item.kind === "absent" ? formatBeta(item.row.previousCoefficient) : NO_VALUE),
              width: "8%",
            },
            {
              key: "registeredBeta",
              header: "β registrada",
              render: (item) => (item.kind === "zero" ? formatBeta(item.row.coefficient) : NO_VALUE),
              width: "8%",
            },
            {
              key: "observedBeta",
              header: "β observada",
              render: (item) =>
                item.kind === "absent" ? (
                  formatBeta(item.row.observedBeta)
                ) : (
                  <ObservedBeta observed={item.row.observedBeta} registered={item.row.coefficient} />
                ),
              width: "8%",
            },
            { key: "measurableDays", header: "Días medibles", render: (item) => measurableDays(item.row), width: "13%" },
            { key: "leaving", header: "Salida observada", render: leaving },
            {
              key: "end",
              header: "Fin registrado",
              render: (item) => (item.kind === "absent" ? registeredEnd(item.row) : NO_VALUE),
              width: "9%",
            },
            { key: "status", header: "Estado", render: status, width: "14%" },
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
  const findings = recommendationFindings(plantId, summary);
  const leavingRows = leavingSectionRows(shown.leavingRows, shown.coefficients);

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
          header={<FilterChips filter={filter} onChange={setFilter} counts={{ all: all.count, warnings: warnings.count }} />}
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
