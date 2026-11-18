import { useEffect, type FC } from "react";
import { Box, Button, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ElectricBoltRoundedIcon from "@mui/icons-material/ElectricBoltRounded";
import type { SupplyResponse } from "../../api/models";
import { BreadCrumb } from "../../components/Breadcrumb";
import { EmptyState } from "../../components/EmptyState";
import { DropdownSelector } from "../../components/Forms/DropdownSelector";
import { LoadErrorAlert } from "../../components/LoadErrorAlert/LoadErrorAlert";
import { Notice } from "../../components/Notice";
import { useErrorDispatch } from "../../context/error.context";
import { sxStyles } from "../../theme/sx";
import { colors, fontFamilies, radii } from "../../theme/tokens";
import { supplyDisplayLabel } from "../../utils/supplyDisplayLabel";
import { TodayContent } from "./TodayContent";
import {
  ADMIN_NOTICE,
  BACK_TO_SUPPLY,
  NO_SUPPLIES_TEXT,
  NO_SUPPLIES_TITLE,
  PAGE_TITLE,
  SELECTOR_LABEL,
} from "./todayTexts";
import { useTodaySupply } from "./useTodaySupply";

// The same words "Mi consumo y ahorro" uses for the same two failures.
const LISTING_ERROR = "Ha habido un problema al cargar tus puntos de suministro. Por favor, inténtalo más tarde";
const VIEWED_SUPPLY_ERROR = "No se pudo cargar el punto de suministro. Comprueba tu conexión e inténtalo de nuevo.";

/** The width the selector and the admin view's supply block share from sm. */
const SIDE_BLOCK_WIDTH = 320;

/**
 * "Datos de hoy" (#432): what reaches one of the caller's supply points from
 * the community's plant today, refreshed every 5 minutes. A community admin
 * reaches a supply they do not own from its detail page, in the admin view.
 */
export const TodayPage: FC = () => {
  const today = useTodaySupply();
  const errorDispatch = useErrorDispatch();

  useEffect(() => {
    if (today.mode === "listingFailed") errorDispatch(LISTING_ERROR);
  }, [today.mode, errorDispatch]);

  const admin = today.mode === "admin" && today.supply ? today.supply : null;
  const showSelector = today.mode === "own" || (today.mode === "pending" && today.isLoadingOptions);

  return (
    <Box sx={sxStyles.pageRoot}>
      {admin && (
        <Box sx={sxStyles.pageContainer}>
          <BreadCrumb
            steps={[
              { label: "Inicio", href: "/" },
              { label: "Puntos de Suministro", href: "/supply-points" },
              { label: supplyDisplayLabel(admin), href: `/supply-points/${admin.id}` },
              { label: PAGE_TITLE, href: "#" },
            ]}
          />
        </Box>
      )}

      <Box
        sx={[
          sxStyles.pageContainer,
          {
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "flex-start" },
            justifyContent: "space-between",
            gap: 2,
          },
        ]}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{ typography: { xs: "h5", sm: "h4" }, fontWeight: 700, color: colors.text.primary }}
        >
          {PAGE_TITLE}
        </Typography>
        {showSelector && (
          <Box sx={{ width: { xs: "100%", sm: SIDE_BLOCK_WIDTH }, flexShrink: 0 }}>
            <DropdownSelector
              label={SELECTOR_LABEL}
              isLoading={today.mode === "pending"}
              options={today.options.map((supply) => ({ value: supply.id, label: supplyDisplayLabel(supply) }))}
              value={today.supply?.id ?? null}
              onChange={(supplyId) => supplyId && today.select(supplyId)}
            />
          </Box>
        )}
        {admin && <AdminSupplyBlock supply={admin} />}
      </Box>

      {today.mode === "lookupFailed" && (
        <Box sx={sxStyles.pageContainer}>
          <LoadErrorAlert message={VIEWED_SUPPLY_ERROR} onRetry={today.retryLookup} />
        </Box>
      )}

      {today.mode === "none" && (
        <Box sx={sxStyles.pageContainer}>
          <EmptyState icon={ElectricBoltRoundedIcon} iconSize={48} title={NO_SUPPLIES_TITLE} subtitle={NO_SUPPLIES_TEXT} />
        </Box>
      )}

      {/* Keyed on the supply: a new selection starts from its own first load. */}
      {today.supply && <TodayContent key={today.supply.id} supply={today.supply} />}
    </Box>
  );
};

/** The admin view's supply (UI-TDY-003): which one it is, and why the caller sees it. */
const AdminSupplyBlock: FC<{ supply: SupplyResponse }> = ({ supply }) => (
  <Box
    sx={{
      width: { xs: "100%", sm: SIDE_BLOCK_WIDTH },
      flexShrink: 0,
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      gap: 1.5,
      p: 2,
      bgcolor: colors.background.paper,
      border: `1px solid ${colors.border.light}`,
      borderRadius: radii.default,
    }}
  >
    <Box>
      <Typography variant="caption" component="p" sx={{ color: colors.text.secondary }}>
        {SELECTOR_LABEL}
      </Typography>
      <Typography variant="body1" component="p" sx={{ fontWeight: 600, color: colors.text.primary, overflowWrap: "anywhere" }}>
        {supplyDisplayLabel(supply)}
      </Typography>
      <Typography variant="body2" component="p" sx={{ fontFamily: fontFamilies.mono, color: colors.text.secondary, overflowWrap: "anywhere" }}>
        {supply.code}
      </Typography>
    </Box>
    <Notice severity="info">{ADMIN_NOTICE}</Notice>
    <Button
      component={RouterLink}
      to={`/supply-points/${supply.id}`}
      variant="outlined"
      startIcon={<ArrowBackRoundedIcon />}
      sx={{ alignSelf: "flex-start" }}
    >
      {BACK_TO_SUPPLY}
    </Button>
  </Box>
);
