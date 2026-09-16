import type { FC } from "react";
import { Box, Drawer, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { colors, fontSizes, radii } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { MIN_DESKTOP_WIDTH } from "../../utils/constants";
import useWindowDimensions from "../../utils/useWindowDimensions";
import { CoefficientHistory } from "../CoefficientHistory";
import { useGetPartitionCoefficientHistory } from "../../api/supplies/supplies";
import type { SupplyReferenceResponse } from "../../api/models";

export interface CoefficientHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** The supply whose timeline is shown. Undefined while nothing is selected. */
  supply: SupplyReferenceResponse | undefined;
  /** Scopes the timeline to the agreement's own plant, so only one group renders. */
  plantId: string;
  /** The agreement the drawer was opened from; its period is marked, not linked. */
  currentSharingAgreementId?: string;
}

const DESKTOP_WIDTH = 440;

/** A supply with no name is identified by its CUPS, never by its UUID. */
function getSupplyLabel(supply: SupplyReferenceResponse | undefined): string {
  if (!supply) return "Suministro";
  return supply.name?.trim() || supply.code || "Suministro";
}

/**
 * The coefficient timeline of one supply within one plant.
 *
 * Only ever rendered inside a CommunityAdminRoute-guarded agreement page for
 * this exact plant, so the caller's entitlement to that plant's community is
 * already proven -- which is why agreement links are always shown here.
 */
export const CoefficientHistoryDrawer: FC<CoefficientHistoryDrawerProps> = ({
  isOpen,
  onClose,
  supply,
  plantId,
  currentSharingAgreementId,
}) => {
  const { width } = useWindowDimensions();
  // A bottom sheet on a phone puts the content under the thumb; a side panel
  // on desktop keeps the agreement table visible beside it. One layout, not
  // two hidden copies, matching how the app's other responsive surfaces
  // choose at the project's desktop breakpoint.
  const isNarrow = width < MIN_DESKTOP_WIDTH;

  const {
    data: periods,
    isLoading,
    error,
  } = useGetPartitionCoefficientHistory(
    supply?.id ?? "",
    { plantId },
    // No supply selected means nothing to ask about; a closed drawer means
    // nobody is looking. Either way the request is not made.
    { query: { enabled: isOpen && !!supply?.id } },
  );

  const supplyLabel = getSupplyLabel(supply);

  return (
    <Drawer
      anchor={isNarrow ? "bottom" : "right"}
      open={isOpen}
      onClose={onClose}
      slotProps={{ paper: { "aria-label": `Histórico de coeficientes de ${supplyLabel}` } }}
      sx={{
        "& .MuiDrawer-paper": {
          width: isNarrow ? "100%" : DESKTOP_WIDTH,
          maxWidth: "100%",
          maxHeight: isNarrow ? "85vh" : "100%",
          borderTopLeftRadius: isNarrow ? radii.large : 0,
          borderTopRightRadius: isNarrow ? radii.large : 0,
          bgcolor: colors.background.paper,
        },
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 1,
            p: { xs: 2, sm: 3 },
            pb: 2,
            borderBottom: `1px solid ${colors.divider}`,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography component="h2" sx={{ fontWeight: 700, fontSize: fontSizes["2xl"], color: colors.text.primary }}>
              Histórico de coeficientes
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: colors.text.secondary, mt: 0.25, overflowWrap: "anywhere" }}
            >
              {supplyLabel}
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Cerrar el histórico" sx={sxStyles.touchTarget}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: { xs: 2, sm: 3 } }}>
          <CoefficientHistory
            periods={periods}
            isLoading={isLoading}
            error={error}
            showAgreementLinks
            currentSharingAgreementId={currentSharingAgreementId}
            emptySubtitle="Este suministro todavía no tiene periodos aplicados en esta planta."
          />
        </Box>
      </Box>
    </Drawer>
  );
};
