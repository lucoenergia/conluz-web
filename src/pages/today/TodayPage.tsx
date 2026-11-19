import { useEffect, type FC } from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import { BreadCrumb } from "../../components/Breadcrumb";
import { NeutralNotice } from "../../components/EnergyFigures/NeutralNotice";
import { LoadErrorAlert } from "../../components/LoadErrorAlert/LoadErrorAlert";
import { SupplySelector } from "../../components/SupplySelector";
import { useErrorDispatch } from "../../context/error.context";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";
import { TODAY_PATH } from "../../utils/routes";
import { TodayContent } from "./TodayContent";
import { PAGE_TITLE } from "./todayTexts";
import { useTodaySupply } from "./useTodaySupply";

// The same words "Mi consumo y ahorro" uses for the same states.
const LISTING_ERROR = "Ha habido un problema al cargar tus puntos de suministro. Por favor, inténtalo más tarde";
const VIEWED_SUPPLY_ERROR = "No se pudo cargar el punto de suministro. Comprueba tu conexión e inténtalo de nuevo.";
const NO_SUPPLY = "No tienes puntos de suministro en esta comunidad";

/**
 * "Datos de hoy" (#432): what reaches one of the caller's supply points from
 * the community's plant today, refreshed every 5 minutes. The header, the
 * selector and its states are those of "Mi consumo y ahorro"; a community
 * admin's view of another member's supply is the selector's "Punto que estás
 * consultando" group, reached from that supply's detail page.
 */
export const TodayPage: FC = () => {
  const { supplies, isLoading, error, selected, viewed, isResolving, lookupFailed, retryLookup, select } = useTodaySupply();
  const errorDispatch = useErrorDispatch();

  useEffect(() => {
    if (error) errorDispatch(LISTING_ERROR);
  }, [error, errorDispatch]);

  // Nothing to show: no own supply here and no other opened, once both are known.
  const noSupplyToShow = supplies?.length === 0 && viewed === null;

  return (
    <Box sx={sxStyles.pageRoot}>
      <Box sx={sxStyles.pageContainer}>
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: PAGE_TITLE, href: TODAY_PATH },
          ]}
        />
      </Box>
      <Box sx={sxStyles.pageContainer}>
        <Typography variant="h4" component="h1" sx={{ color: colors.text.primary }}>
          {PAGE_TITLE}
        </Typography>
      </Box>
      {(isLoading || isResolving) && (
        <Box sx={sxStyles.pageContainer}>
          <Skeleton variant="rounded" height={56} sx={{ maxWidth: 560 }} />
        </Box>
      )}
      {noSupplyToShow && !isResolving && lookupFailed && <LoadErrorAlert message={VIEWED_SUPPLY_ERROR} onRetry={retryLookup} />}
      {noSupplyToShow && !isResolving && !lookupFailed && <NeutralNotice>{NO_SUPPLY}</NeutralNotice>}
      {supplies && selected && (
        <Box sx={sxStyles.pageContainer}>
          <SupplySelector supplies={supplies} selected={selected} viewed={viewed} onSelect={select} showAll={false} />
        </Box>
      )}
      {/* Keyed on the supply: a new selection starts from its own first load. */}
      {selected && <TodayContent key={selected.id} supply={selected} />}
    </Box>
  );
};
