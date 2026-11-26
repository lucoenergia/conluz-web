import { useState, type FC, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import { Accordion, AccordionDetails, AccordionSummary, Box, Link, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { ListTable } from "../../../components/ListTable";
import { RecordList } from "../../../components/RecordList";
import { useListLayout } from "../../../components/ResponsiveRecordList/useListLayout";
import { colors } from "../../../theme/tokens";
import { supplyDisplayLabel, supplyLabelSource } from "../../../utils/supplyDisplayLabel";
import type { AgreementAnomalies, SupplyAnomalies } from "./anomalyGroups";
import { ANOMALY_TYPE_LABEL } from "./observedSharingLabels";
import { formatAnomalyDetail, formatAnomalyEnd, formatObservedDate } from "./observedSharingFormat";
import type { SharingAnomalyResponse, SupplyReferenceResponse } from "../../../api/models";

const anomaliesCount = (count: number) => `${count} ${count === 1 ? "anomalía" : "anomalías"}`;
const suppliesCount = (count: number) => `${count} ${count === 1 ? "punto" : "puntos"}`;

/**
 * The id of the group of the supply's anomalies listed under the same
 * agreement, or undefined when that supply has none there.
 */
type GroupOf = (supplyId: string) => string | undefined;

/** How to bring a supply's anomalies into view, by their group's id. */
type OpenGroup = (groupId: string) => void;

const summaryId = (groupId: string) => `${groupId}-summary`;

/**
 * "Intercambiado con <name> (<CUPS>)" (UI-AGR-044): the supply the backend
 * says this one is swapped with, never worked out here. Its name leads to that
 * supply's anomalies when they are listed under the same agreement. A supply
 * named by its CUPS shows it once.
 */
const SwappedWith: FC<{ supply: SupplyReferenceResponse; groupOf: GroupOf; openGroup: OpenGroup }> = ({
  supply,
  groupOf,
  openGroup,
}) => {
  const name = supplyDisplayLabel(supply);
  const groupId = groupOf(supply.id);
  const open = (event: MouseEvent) => {
    event.preventDefault();
    if (groupId) openGroup(groupId);
  };
  return (
    <>
      Intercambiado con{" "}
      {groupId ? (
        <Link href={`#${summaryId(groupId)}`} onClick={open}>
          {name}
        </Link>
      ) : (
        name
      )}
      {supplyLabelSource(supply) !== "code" && ` (${supply.code})`}
    </>
  );
};

/** One supply's anomalies: a table from the list width up, stacked rows below. */
const AnomalyRows: FC<{ group: SupplyAnomalies; groupOf: GroupOf; openGroup: OpenGroup }> = ({
  group,
  groupOf,
  openGroup,
}) => {
  const layout = useListLayout();
  const label = `Anomalías de ${supplyDisplayLabel(group.supply)}`;
  const swappedWith = (anomaly: SharingAnomalyResponse) =>
    anomaly.swappedWith && <SwappedWith supply={anomaly.swappedWith} groupOf={groupOf} openGroup={openGroup} />;

  if (layout === "narrow") {
    return (
      <RecordList
        label={label}
        items={group.anomalies.map((anomaly) => ({
          id: anomaly.id,
          title: ANOMALY_TYPE_LABEL[anomaly.type],
          lines: [
            `Inicio: ${formatObservedDate(anomaly.start)} · Fin: ${formatAnomalyEnd(anomaly.end)}`,
            formatAnomalyDetail(anomaly),
            ...(anomaly.swappedWith ? [swappedWith(anomaly)] : []),
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
          render: (anomaly) => (
            <>
              {formatAnomalyDetail(anomaly)}
              {anomaly.swappedWith && (
                <Box component="span" sx={{ display: "block", overflowWrap: "anywhere" }}>
                  {swappedWith(anomaly)}
                </Box>
              )}
            </>
          ),
        },
      ]}
    />
  );
};

/**
 * The id of a supply's anomalies under an agreement. A supply can sit under
 * more than one agreement, so the id carries both.
 */
const supplyGroupId = (agreementKey: string, supplyId: string) => `observed-anomalies-${agreementKey}-${supplyId}`;

/**
 * A supply's anomalies, collapsible, saying how many there are while
 * collapsed. Its heading sits one level below its agreement's, when there is one.
 * The summary's id names the region that holds the rows.
 */
const SupplyAnomaliesItem: FC<{
  group: SupplyAnomalies;
  id: string;
  expanded: boolean;
  onToggle: (id: string, expanded: boolean) => void;
  heading: "h3" | "h4";
  groupOf: GroupOf;
  openGroup: OpenGroup;
}> = ({ group, id, expanded, onToggle, heading, groupOf, openGroup }) => (
  <Accordion
    disableGutters
    expanded={expanded}
    onChange={(_, isExpanded) => onToggle(id, isExpanded)}
    slots={{ heading }}
    elevation={0}
    sx={{ border: `1px solid ${colors.border.light}`, "&::before": { display: "none" } }}
  >
    <AccordionSummary
      expandIcon={<ExpandMoreIcon />}
      id={summaryId(id)}
      aria-controls={`${id}-rows`}
      // A swap's link brings it into view below the app bar.
      sx={{ scrollMarginTop: (theme) => theme.spacing(10) }}
    >
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
      <AnomalyRows group={group} groupOf={groupOf} openGroup={openGroup} />
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
 * it lasted. Which supplies are expanded is held here, so that something else
 * on the list can open one; a supply nobody has toggled follows `defaultExpanded`.
 */
export const ObservedAnomalies: FC<ObservedAnomaliesProps> = ({ groups, showAgreements, defaultExpanded }) => {
  const [toggled, setToggled] = useState<ReadonlyMap<string, boolean>>(new Map());
  const isExpanded = (id: string) => toggled.get(id) ?? defaultExpanded;
  const setExpanded = (id: string, expanded: boolean) => setToggled((current) => new Map(current).set(id, expanded));
  // Expanded first, so its rows are on the page when it comes into view.
  const openGroup = (id: string) => {
    flushSync(() => setExpanded(id, true));
    const summary = document.getElementById(summaryId(id));
    summary?.scrollIntoView({ block: "start" });
    summary?.focus({ preventScroll: true });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {groups.map((group) => {
        const agreementKey = group.agreement?.id ?? "unattributed";
        const listed = new Set(group.supplies.map(({ supply }) => supply.id));
        const groupOf: GroupOf = (supplyId) => (listed.has(supplyId) ? supplyGroupId(agreementKey, supplyId) : undefined);
        return (
          <Box key={agreementKey} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
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
            {group.supplies.map((supplyGroup) => {
              const id = supplyGroupId(agreementKey, supplyGroup.supply.id);
              return (
                <SupplyAnomaliesItem
                  key={supplyGroup.supply.id}
                  group={supplyGroup}
                  id={id}
                  expanded={isExpanded(id)}
                  onToggle={setExpanded}
                  heading={showAgreements ? "h4" : "h3"}
                  groupOf={groupOf}
                  openGroup={openGroup}
                />
              );
            })}
          </Box>
        );
      })}
    </Box>
  );
};
