import { colors } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { useState, type FC } from "react";
import { Box } from "@mui/material";
import { useParams } from "react-router";
import { BreadCrumb } from "../../components/Breadcrumb";
import { PlantDetailHeader } from "../../components/PlantDetailHeader";
import { usePlantInActiveCommunity } from "./usePlantInActiveCommunity";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { EmptyState } from "../../components/EmptyState";
import { PlantIntegrationsSection } from "./PlantIntegrationsSection";
import { PlantSummary } from "./plantDetail/PlantSummary";
import { PlantNextStep } from "./plantDetail/PlantNextStep";
import { PlantAgreementsSection } from "./plantDetail/PlantAgreementsSection";
import { usePlantIntegrationStatus } from "./plantDetail/usePlantIntegrationStatus";
import { PlantPeriodProduction } from "./plantDetail/PlantPeriodProduction";
import { PlantInverterToday } from "./plantDetail/PlantInverterToday";
import { PLANT_DEFAULT_PRESET, PLANT_PRESETS, plantClampNotice } from "./plantDetail/plantPeriod";
import { readDayAnchor, usePlantAnchorQuery } from "./plantDetail/usePlantAnchorQuery";
import { useHistoricalAnchor } from "../../components/period/useHistoricalAnchor";
import { useHistoricalPeriodState } from "../../components/period/useHistoricalPeriodState";
import { useOverlayNavigate } from "../../components/ResponsiveOverlay";
import { useOverlayOpener } from "../../hooks/useOverlayOpener";
import { usePlantActions } from "../../hooks/actions";
import { PlantFormDialog } from "./PlantFormDialog";
import { PlantDeletionDialog } from "./PlantDeletionDialog";

/**
 * A plant's detail, for the admins of its community (#406): what it is, what
 * its inverter produced today and what the distributor measured over a
 * period, its sharing agreements and its integration.
 */
export const PlantDetailPage: FC = () => {
  const { plantId = "" } = useParams();

  const { plant, isLoading: plantLoading, isNotFound: isPlantNotFound, error: plantError } =
    usePlantInActiveCommunity(plantId);
  const integrationStatus = usePlantIntegrationStatus(plant);
  // Edit and delete open over the detail, from the header's menu (UI-PLT-014).
  // Each dialog mounts only while the plant grants its action.
  const { edit, remove } = usePlantActions().forPlant(plant).actions;
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  // The menu item that opened the form is gone by the time it closes, so focus
  // returns to the menu's button.
  const editOpener = useOverlayOpener(isEditOpen);
  // Each navigation here leaves the page as an overlay closes (UI-OVL-004).
  const navigate = useOverlayNavigate();

  // The period of "Producción por periodo", anchored to the plant's latest
  // complete production day (UI-PLT-011). Nothing is asked before the plant,
  // and so its community, is known.
  const anchorQuery = usePlantAnchorQuery(plant?.id);
  const anchor = useHistoricalAnchor(anchorQuery, readDayAnchor);
  const period = useHistoricalPeriodState(anchor, {
    presets: PLANT_PRESETS,
    defaultPreset: PLANT_DEFAULT_PRESET,
    scopeKey: plantId,
    clampNotice: plantClampNotice,
  });

  // A plant outside the active community is withheld.
  if (isPlantNotFound) {
    return (
      <Box sx={sxStyles.pageContainer}>
        <EmptyState
          icon={SearchOffIcon}
          title="Planta no encontrada"
          subtitle="Esta planta no existe o no tienes acceso a su comunidad."
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
            { label: "Plantas", href: "/plants" },
            { label: plant?.name || plantId, href: "#" },
          ]}
        />
      </Box>

      {/* Header Section */}
      <Box sx={sxStyles.pageContainer}>
        <PlantDetailHeader
          plant={plant}
          isLoading={plantLoading}
          error={plantError}
          onEditRequest={
            edit &&
            ((opener) => {
              editOpener.record(opener);
              setIsEditOpen(true);
            })
          }
          onDeleteRequest={remove && (() => setIsDeleteOpen(true))}
        />
      </Box>

      {isEditOpen && edit && plant && (
        <PlantFormDialog target={{ kind: "edit", plantId: plant.id }} onClose={() => setIsEditOpen(false)} />
      )}

      {/* Once the plant is gone -- deleted now, or already (a 404) -- there is
          nothing left to show here, so the screen returns to the list. */}
      <PlantDeletionDialog
        plant={isDeleteOpen ? plant : undefined}
        onClose={() => setIsDeleteOpen(false)}
        // Replacing this page: one back must not land on a plant that is gone.
        onGone={() => navigate("/plants", { replace: true })}
      />

      {/* Only while the integration needs a step from someone who may manage it.
          Edge to edge on a phone, as the agreement's next step is. */}
      <Box sx={{ "&:empty": { display: "none" } }}>
        <PlantNextStep integrationStatus={integrationStatus} />
      </Box>

      {/* What the caller may look into: renders nothing when that is nothing. */}
      <Box sx={{ ...sxStyles.pageContainer, "&:empty": { display: "none" } }}>
        <PlantSummary plant={plant} integrationStatus={integrationStatus} />
      </Box>

      {/* Today's inverter production, apart from the distributor's: only for a
          plant with an enabled inverter integration (UI-PLT-012). */}
      {plant && (
        <Box sx={{ ...sxStyles.pageContainer, "&:empty": { display: "none" } }}>
          <PlantInverterToday plantId={plant.id} />
        </Box>
      )}

      {plant && (
        <Box sx={sxStyles.pageContainer}>
          <PlantPeriodProduction plantId={plant.id} anchor={anchor} period={period} />
        </Box>
      )}

      {plant?.capabilities.canListSharingAgreements && (
        <Box sx={sxStyles.pageContainer}>
          <PlantAgreementsSection plant={plant} />
        </Box>
      )}

      {/* Integrations: only for a caller who may manage this plant. No wrapper:
          a caller without canManage must not get an empty box and its gap. */}
      <PlantIntegrationsSection plant={plant} />
    </Box>
  );
};
