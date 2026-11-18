import { useEffect, useState, type FC } from "react";
import { sxStyles } from "../../theme/sx";
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
import { Can, outcomeFromResource, usePlantCapabilities } from "../../hooks/permissions";
import { useSupplyActions } from "../../hooks/actions";
import { SupplyDeletionDialog } from "./SupplyDeletionDialog";
import { supplyDisplayLabel } from "../../utils/supplyDisplayLabel";
import { SupplyLatestMonthSummary } from "./SupplyLatestMonthSummary";
import { SupplyTransferDialog } from "./SupplyTransferDialog";
import { useOverlayOpener } from "../../hooks/useOverlayOpener";
import { SUPPLY_ID_PARAM, TODAY_PATH } from "../../utils/routes";

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
  const { remove, transferOwnership } = useSupplyActions().forSupply(supplyPoint).actions;
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  // The ownership transfer, and the header's menu button focus returns to.
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const transferOpener = useOverlayOpener(isTransferOpen);
  // Each navigation here leaves the page as an overlay closes (UI-OVL-004).
  const navigate = useOverlayNavigate();
  // A plant's detail opens only to whoever may manage that plant (#406). The
  // plant reference carries no capabilities of its own, so the tag reads the
  // plant itself: the same request, and the same answer, as the route guard.
  const plantId = supplyPoint?.plant?.id;
  const canOpenPlant = usePlantCapabilities(plantId, "canManage", { enabled: !!plantId }).state === "allowed";
  const plantHref = canOpenPlant && plantId ? `/plants/${plantId}` : undefined;
  // "Datos de hoy" (#432) opens to whoever may read the supply, but a plant's
  // own supply receives no share of the plant's production, so it has none.
  const todayHref =
    supplyPoint && canReadSupply.state === "allowed" && !supplyPoint.plant
      ? `${TODAY_PATH}?${new URLSearchParams({ [SUPPLY_ID_PARAM]: supplyPoint.id })}`
      : undefined;

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
      <Box sx={sxStyles.pageRoot}>
        <Box sx={sxStyles.pageContainer}>
          <EmptyState
            icon={SearchOffIcon}
            title="Punto de suministro no encontrado"
            subtitle="Este punto de suministro no existe o no tienes acceso a su comunidad."
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={[sxStyles.pageRoot, { overflow: "hidden" }]}>
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
          onTransferRequest={
            transferOwnership &&
            ((opener) => {
              transferOpener.record(opener);
              setIsTransferOpen(true);
            })
          }
          plantHref={plantHref}
          todayHref={todayHref}
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

      {/* Mounted on open, with the gate of the menu item that opens it. */}
      {isTransferOpen && transferOwnership && (
        <SupplyTransferDialog supplyId={supplyPointId} onClose={() => setIsTransferOpen(false)} />
      )}

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
