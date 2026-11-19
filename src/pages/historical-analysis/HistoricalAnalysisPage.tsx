import { useEffect, type FC } from "react";
import { Box, Skeleton, Typography, formControlClasses, type Theme } from "@mui/material";
import type { SupplyResponse } from "../../api/models";
import { useErrorDispatch } from "../../context/error.context";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";
import { ActionStatus } from "../../components/ActionStatus/ActionStatus";
import { LoadErrorAlert } from "../../components/LoadErrorAlert/LoadErrorAlert";
import { Notice } from "../../components/Notice/Notice";
import { NeutralNotice } from "../../components/EnergyFigures/NeutralNotice";
import { HistoricalPeriodContext } from "../../components/period/HistoricalPeriodContext";
import { PeriodDataTable } from "./PeriodDataTable";
import { PeriodEvolution } from "./PeriodEvolution";
import { PeriodFigures } from "./PeriodFigures";
import { PeriodHeader } from "../../components/EnergyFigures/PeriodHeader";
import { PeriodSelector } from "../../components/period/PeriodSelector";
import { SupplySelector } from "../../components/SupplySelector";
import { useHistoricalAnchor, type HistoricalAnchor } from "../../components/period/useHistoricalAnchor";
import { MEMBER_DEFAULT_PRESET, MEMBER_PRESETS, memberClampNotice, memberPublicationText } from "./memberPeriod";
import { readMonthAnchor, useMemberAnchorQuery } from "./useMemberAnchorQuery";
import { useHistoricalPeriodState, type HistoricalPeriodState } from "../../components/period/useHistoricalPeriodState";
import { useOwnSupplies } from "./useOwnSupplies";
import { useSelectedSupply } from "./useSelectedSupply";
import { BreadCrumb } from "../../components/Breadcrumb";
import { HISTORICAL_ANALYSIS_PATH } from "../../utils/routes";

/**
 * "Mi consumo y ahorro": the caller's own supplies over time (#247). This
 * holds the supply selector and the period, anchored to the latest month
 * published for the selected scope (#248), and below them the period's
 * figures (#249), their evolution charts (#250) and the data table with its
 * CSV download (#251), all in one content region that reads the period
 * through `useHistoricalPeriod`.
 *
 * A community admin may also open a supply of the community they manage
 * (#252), even one who owns none here (#385): the neutral state is only for a
 * caller with nothing to show once that supply has been resolved.
 */
export const HistoricalAnalysisPage: FC = () => {
  const { supplies, isLoading, error } = useOwnSupplies();
  const { selected, viewed, isResolving, lookupFailed, retryLookup, select } = useSelectedSupply(supplies);
  const ownsSupplies = supplies !== undefined && supplies.length > 0;
  // A caller who owns none here may still be viewing a supply they manage (#385).
  const noSupplyToShow = supplies?.length === 0 && viewed === null;
  const anchor = useHistoricalAnchor(useMemberAnchorQuery(selected, { allMine: ownsSupplies }), readMonthAnchor);
  const period = useHistoricalPeriodState(anchor, {
    presets: MEMBER_PRESETS,
    defaultPreset: MEMBER_DEFAULT_PRESET,
    scopeKey: selected?.id ?? "all",
    clampNotice: memberClampNotice(selected),
  });
  const errorDispatch = useErrorDispatch();

  useEffect(() => {
    if (error) {
      errorDispatch("Ha habido un problema al cargar tus puntos de suministro. Por favor, inténtalo más tarde");
    }
  }, [error, errorDispatch]);

  return (
    <Box sx={sxStyles.pageRoot}>
      <Box sx={sxStyles.pageContainer}>
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: PAGE_TITLE, href: HISTORICAL_ANALYSIS_PATH },
          ]}
        />
      </Box>
      <Box sx={sxStyles.pageContainer}>
        <Typography variant="h4" component="h1" sx={{ color: colors.text.primary }}>
          {PAGE_TITLE}
        </Typography>
      </Box>
      {(isLoading || (noSupplyToShow && isResolving)) && (
        <Box sx={sxStyles.pageContainer}>
          <Skeleton variant="rounded" height={56} sx={{ maxWidth: 560 }} />
        </Box>
      )}
      {noSupplyToShow && !isResolving && lookupFailed && <LoadErrorAlert message={VIEWED_SUPPLY_ERROR} onRetry={retryLookup} />}
      {noSupplyToShow && !isResolving && !lookupFailed && (
        <NeutralNotice>No tienes puntos de suministro en esta comunidad</NeutralNotice>
      )}
      {supplies && (ownsSupplies || viewed !== null) && (
        <>
          <Box sx={[sxStyles.pageContainer, SELECTORS_ROW_SX]}>
            <Box sx={SELECTOR_CELL_SX}>
              <SupplySelector supplies={supplies} selected={selected} viewed={viewed} onSelect={select} />
            </Box>
            {anchor.status === "loading" && <Skeleton variant="rounded" height={64} sx={{ width: "100%" }} />}
            {anchor.status === "ready" && (
              <Box sx={SELECTOR_CELL_SX}>
                <PeriodSelector anchor={anchor.anchor} presets={MEMBER_PRESETS} selection={period.selection} onSelect={period.select} />
              </Box>
            )}
          </Box>
          {/* Mounted before the anchor resolves, so a clamp the page arrives with is announced. */}
          <ActionStatus message={period.clampNotice} />
          <AnchoredContent anchor={anchor} period={period} selected={selected} />
        </>
      )}
    </Box>
  );
};

/**
 * The supply and period selectors (#432). From sm, one row of two equal
 * columns, each at most as wide as the supply field: the fields share the
 * first grid row, so both stretch to the taller one, and the supply's footer
 * takes the second row under its own field, without pushing the period field
 * down. Each field's FormControl joins the grid through subgrid. Below sm,
 * stacked.
 */
const SELECTORS_ROW_SX = (theme: Theme) => ({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  [theme.breakpoints.up("sm")]: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 560px))",
    gridTemplateRows: "auto auto",
    columnGap: 2,
    rowGap: 0,
  },
});

const SELECTOR_CELL_SX = (theme: Theme) => ({
  minWidth: 0,
  width: "100%",
  [theme.breakpoints.up("sm")]: {
    display: "grid",
    gridRow: "span 2",
    gridTemplateRows: "subgrid",
    [`& > .${formControlClasses.root}`]: { display: "grid", gridRow: "span 2", gridTemplateRows: "subgrid", maxWidth: "none" },
  },
});

const PAGE_TITLE = "Mi consumo y ahorro";
const VIEWED_SUPPLY_ERROR = "No se pudo cargar el punto de suministro. Comprueba tu conexión e inténtalo de nuevo.";
const NO_DATA_TITLE = "Todavía no hay datos publicados";
const NO_DATA_BODY =
  "La distribuidora publica los datos de cada mes hacia el día 10 del mes siguiente. Los verás aquí en cuanto se publique tu primer mes.";
const ANCHOR_ERROR = "No se pudieron cargar tus datos de energía. Comprueba tu conexión e inténtalo de nuevo.";

/** What hangs off the latest published month of the selected scope (UI-HIS-005). */
const AnchoredContent: FC<{ anchor: HistoricalAnchor; period: HistoricalPeriodState; selected: SupplyResponse | null }> = ({
  anchor,
  period,
  selected,
}) => {
  switch (anchor.status) {
    case "loading":
      return null;
    case "error":
      return <LoadErrorAlert message={ANCHOR_ERROR} onRetry={anchor.retry} />;
    case "none":
      // Neutral, not a failure: nothing is published yet for this scope.
      return <NeutralNotice title={NO_DATA_TITLE}>{NO_DATA_BODY}</NeutralNotice>;
    case "ready": {
      const { resolution } = period;
      const resolved = resolution?.status === "ok" ? resolution : null;
      return (
        <>
          {period.clampNotice && <Notice severity="info">{period.clampNotice}</Notice>}
          {resolved && (
            <Box sx={sxStyles.pageContainer}>
              <PeriodHeader anchor={anchor.anchor} resolution={resolved} publication={memberPublicationText} />
            </Box>
          )}
          <HistoricalPeriodContext.Provider value={resolved?.period}>
            {/* The content region the figures land in. */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <PeriodFigures selected={selected} />
              <PeriodEvolution selected={selected} />
              <PeriodDataTable selected={selected} />
            </Box>
          </HistoricalPeriodContext.Provider>
        </>
      );
    }
  }
};
