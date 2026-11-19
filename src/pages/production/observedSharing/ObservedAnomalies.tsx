import type { FC } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { ListTable } from "../../../components/ListTable";
import { RecordList } from "../../../components/RecordList";
import { useListLayout } from "../../../components/ResponsiveRecordList/useListLayout";
import { colors } from "../../../theme/tokens";
import { supplyDisplayLabel } from "../../../utils/supplyDisplayLabel";
import type { AgreementAnomalies, SupplyAnomalies } from "./anomalyGroups";
import { ANOMALY_TYPE_LABEL } from "./observedSharingLabels";
import { formatAnomalyDetail, formatAnomalyEnd, formatObservedDate } from "./observedSharingFormat";
import type { SharingAnomalyResponse } from "../../../api/models";

const anomaliesCount = (count: number) => `${count} ${count === 1 ? "anomalía" : "anomalías"}`;
const suppliesCount = (count: number) => `${count} ${count === 1 ? "punto" : "puntos"}`;

/** One supply's anomalies: a table from the list width up, stacked rows below. */
const AnomalyRows: FC<{ group: SupplyAnomalies }> = ({ group }) => {
  const layout = useListLayout();
  const label = `Anomalías de ${supplyDisplayLabel(group.supply)}`;

  if (layout === "narrow") {
    return (
      <RecordList
        label={label}
        items={group.anomalies.map((anomaly) => ({
          id: anomaly.id,
          title: ANOMALY_TYPE_LABEL[anomaly.type],
          lines: [
            `Inicio: ${formatObservedDate(anomaly.start)} · Fin: ${formatAnomalyEnd(anomaly.end)}`,
            formatAnomalyDetail(anomaly.observedBeta, anomaly.observedValidDays),
          ],
        }))}
      />
    );
  }

  return (
    <ListTable<SharingAnomalyResponse>
      rows={group.anomalies}
      getRowKey={(anomaly) => anomaly.id}
      isLoading={false}
      title={{ header: "Tipo", text: (anomaly) => ANOMALY_TYPE_LABEL[anomaly.type], width: "28%" }}
      columns={[
        { key: "start", header: "Inicio", render: (anomaly) => formatObservedDate(anomaly.start), width: "24%" },
        { key: "end", header: "Fin", render: (anomaly) => formatAnomalyEnd(anomaly.end), width: "14%" },
        {
          key: "detail",
          header: "Detalle",
          render: (anomaly) => formatAnomalyDetail(anomaly.observedBeta, anomaly.observedValidDays),
        },
      ]}
    />
  );
};

/**
 * A supply's anomalies, collapsible, saying how many there are while
 * collapsed. Its heading sits one level below its agreement's, when there is one.
 */
const SupplyAnomaliesItem: FC<{ group: SupplyAnomalies; defaultExpanded: boolean; heading: "h3" | "h4" }> = ({
  group,
  defaultExpanded,
  heading,
}) => (
  <Accordion
    disableGutters
    defaultExpanded={defaultExpanded}
    slots={{ heading }}
    elevation={0}
    sx={{ border: `1px solid ${colors.border.light}`, "&::before": { display: "none" } }}
  >
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 1, rowGap: 0.25, minWidth: 0 }}>
        <Typography component="span" sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
          {supplyDisplayLabel(group.supply)}
        </Typography>
        <Typography component="span" variant="body2" sx={{ color: colors.text.subtle, overflowWrap: "anywhere" }}>
          {group.supply.code}
        </Typography>
        <Typography component="span" variant="body2" sx={{ color: colors.warning.main, fontWeight: 600 }}>
          {anomaliesCount(group.anomalies.length)}
        </Typography>
      </Box>
    </AccordionSummary>
    <AccordionDetails sx={{ p: 0 }}>
      <AnomalyRows group={group} />
    </AccordionDetails>
  </Accordion>
);

interface ObservedAnomaliesProps {
  groups: AgreementAnomalies[];
  /** On the plant's page each agreement heads its anomalies; an agreement's own page needs no heading. */
  showAgreements: boolean;
  defaultExpanded: boolean;
}

/**
 * The anomalies by agreement, then by supply (UI-AGR-024): each with its type,
 * its start (or range) and its end (or "en curso"), and the β observed while
 * it lasted.
 */
export const ObservedAnomalies: FC<ObservedAnomaliesProps> = ({ groups, showAgreements, defaultExpanded }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
    {groups.map((group) => (
      <Box key={group.agreement?.id ?? "unattributed"} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {showAgreements && (
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 1 }}>
            <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
              {group.agreement?.name ?? "Sin acuerdo atribuido"}
            </Typography>
            <Typography variant="body2" sx={{ color: colors.text.subtle }}>
              {anomaliesCount(group.count)} · {suppliesCount(group.supplies.length)}
            </Typography>
          </Box>
        )}
        {group.supplies.map((supplyGroup) => (
          <SupplyAnomaliesItem
            key={supplyGroup.supply.id}
            group={supplyGroup}
            defaultExpanded={defaultExpanded}
            heading={showAgreements ? "h4" : "h3"}
          />
        ))}
      </Box>
    ))}
  </Box>
);
