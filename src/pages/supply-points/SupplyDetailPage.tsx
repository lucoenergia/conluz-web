import { useEffect, useState, type FC } from "react";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";
import { Box } from "@mui/material";
import { useParams } from "react-router";
import { useOverlayNavigate } from "../../components/ResponsiveOverlay";
import { BreadCrumb } from "../../components/Breadcrumb";
import { SupplyDetailHeader } from "../../components/SupplyDetailHeader";
import { SupplyCoefficientHistorySection } from "../../components/SupplyCoefficientHistorySection";
import { useSupplyInActiveCommunity } from "./useSupplyInActiveCommunity";
import { useErrorDispatch } from "../../context/error.context";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { EmptyState } from "../../components/EmptyState";
import { Can, outcomeFromResource, useActiveCommunityCapabilities } from "../../hooks/permissions";
import { useSupplyActions } from "../../hooks/actions";
import { SupplyDeletionDialog } from "./SupplyDeletionDialog";
import { supplyDisplayLabel } from "../../utils/supplyDisplayLabel";
import { SupplyLatestMonthSummary } from "./SupplyLatestMonthSummary";

/**
 * The supply's record (#252): its header, its coefficient history and a
 * summary of its latest published month. The figures come from the server,
 * as on the historical analysis page, which this page links to for the full
 * analysis; there is no period selector and no chart here.
 */
export const SupplyDetailPage: FC = () => {
  const { supplyPointId = "" } = useParams();
  const errorDispatch = useErrorDispatch();

  const { supply: supplyPoint, isLoading: supplyPointLoading, isNotFound: isSupplyNotFound, error: supplyPointError } =
    useSupplyInActiveCommunity(supplyPointId);

  // The coefficients describe this supply's own share, so the backend opens
  // them to its owner as well as to a community admin -- canRead, never
  // canEdit. Asking it here also keeps the history request from firing for a
  // supply the caller could not read in the first place.
  const canReadSupply = outcomeFromResource(supplyPoint?.capabilities, "canRead");
  const { remove } = useSupplyActions().forSupply(supplyPoint).actions;
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  // Each navigation here leaves the page as an overlay closes (UI-OVL-004).
  const navigate = useOverlayNavigate();
  // A plant opens to any reader of its community -- the same canRead the
  // /plants routes require -- and the plant reference carries no
  // capabilities of its own, so the tag links on the community's answer.
  const canOpenPlants = useActiveCommunityCapabilities("canRead").state === "allowed";
  const plantHref = canOpenPlants && supplyPoint?.plant ? `/plants/${supplyPoint.plant.id}` : undefined;

  useEffect(() => {
    if (supplyPointError)
      errorDispatch(
        "Ha habido un problema al cargar la información de este punto de suministro. Por favor, inténtalo más tarde",
      );
  }, [supplyPointError]);

  // Missing, or belonging to a community the caller is not working in: the
  // wrapper folds both into one answer, so there is one empty state rather than
  // a second that would say which of the two it was.
  if (isSupplyNotFound) {
    return (
      <Box sx={sxStyles.pageContainer}>
        <EmptyState
          icon={SearchOffIcon}
          title="Punto de suministro no encontrado"
          subtitle="Este punto de suministro no existe o no tienes acceso a su comunidad."
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2, sm: 3 },
        p: { xs: 0, sm: 2, md: 3 },
        minHeight: "100vh",
        background: colors.background.default,
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Breadcrumb */}
      <Box sx={sxStyles.pageContainer}>
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: "Puntos de Suministro", href: "/supply-points" },
            { label: supplyPoint ? supplyDisplayLabel(supplyPoint) : supplyPointId, href: "#" },
          ]}
        />
      </Box>

      {/* Header Section */}
      <Box sx={sxStyles.pageContainer}>
        <SupplyDetailHeader
          supplyPoint={supplyPoint}
          isLoading={supplyPointLoading}
          error={supplyPointError}
          onDeleteRequest={remove && (() => setIsDeleteOpen(true))}
          plantHref={plantHref}
        />
      </Box>

      {/* Once the supply is gone -- deleted now, or already (a 404) -- there is
          nothing left to show here, so the screen returns to the list. */}
      <SupplyDeletionDialog
        supply={isDeleteOpen ? supplyPoint : undefined}
        onClose={() => setIsDeleteOpen(false)}
        // Replacing this page: one back must not land on a supply that is gone.
        onGone={() => navigate("/supply-points", { replace: true })}
      />

      {/* Coefficient history: contract information about the supply. */}
      <Can outcome={canReadSupply}>
        <SupplyCoefficientHistorySection supplyId={supplyPointId} />
      </Can>

      {supplyPoint && (
        <Box sx={sxStyles.pageContainer}>
          <SupplyLatestMonthSummary supply={supplyPoint} />
        </Box>
      )}
    </Box>
  );
};
