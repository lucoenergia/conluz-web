import { useState, type FC, type Ref } from "react";
import { Box, IconButton, MenuItem, Paper, Typography, Divider } from "@mui/material";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementResponseStatus,
} from "../../api/models";
import type { PlantResponse, SharingAgreementResponse } from "../../api/models";
import { SharingAgreementStatusChip } from "../SharingAgreementStatusChip";
import { SharingAgreementLifecycleSpine, type LifecycleSpineAction } from "../SharingAgreementLifecycleSpine";
import { MenuTemplate } from "../Menu/MenuTemplate";
import { formatCalendarDate } from "../../utils/formatCalendarDate";
import { colors, radii } from "../../theme/tokens";
import {
  COEFFICIENT_SCALE,
  computeSharingAgreementCoefficientSums,
  isFullSum,
  type CoefficientSummable,
} from "../../pages/production/sharingAgreementCoefficientSums";
import { formatCoefficientGapMessage } from "../../pages/production/sharingAgreementGapMessage";
import { selectSharingAgreementLifecycleView } from "../../pages/production/sharingAgreementLifecycle";
import type { SharingAgreementNextStep } from "../../pages/production/selectSharingAgreementNextStep";

export interface SharingAgreementDetailHeaderProps {
  agreement?: SharingAgreementResponse;
  plant?: PlantResponse;
  isLoading?: boolean;
  error?: unknown;
  /**
   * The raw, non-defaulted partition-coefficients query result: `undefined` while still in
   * flight, as opposed to a resolved `[]` — mirrors `selectSharingAgreementNextStep`'s own
   * distinction. Conflating the two would let a PUBLISHED agreement with applied coefficients
   * briefly show "Volver a borrador" (since `[].every(...)` is vacuously true), and would render
   * "sin coeficientes" for a DRAFT that actually has them, for a fraction of a second on every load.
   */
  coefficients?: CoefficientSummable[];
  nextStep: SharingAgreementNextStep;
  /** Focus target after an action whose own control unmounts on success. */
  headingRef?: Ref<HTMLHeadingElement>;
  onEdit?: () => void;
  onDeleteRequest?: () => void;
  onPublishRequest?: () => void;
  onRevertRequest?: () => void;
  onGenerateRequest?: () => void;
}

export const SharingAgreementDetailHeader: FC<SharingAgreementDetailHeaderProps> = ({
  agreement,
  plant,
  isLoading = false,
  error = null,
  coefficients,
  nextStep,
  headingRef,
  onEdit,
  onDeleteRequest,
  onPublishRequest,
  onRevertRequest,
  onGenerateRequest,
}) => {
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const isDraft = agreement?.status === SharingAgreementResponseStatus.DRAFT;
  const isPublished = agreement?.status === SharingAgreementResponseStatus.PUBLISHED;

  const publishDisabledReason = (() => {
    if (coefficients === undefined) return undefined;
    if (coefficients.length === 0) return "Este acuerdo todavía no tiene coeficientes.";
    const { fileSumUnits } = computeSharingAgreementCoefficientSums(coefficients);
    if (isFullSum(fileSumUnits)) return undefined;
    return formatCoefficientGapMessage(COEFFICIENT_SCALE - fileSumUnits) ?? undefined;
  })();

  const isInert =
    coefficients !== undefined &&
    coefficients.every(
      (coefficient) =>
        coefficient.applicationState !== SharingAgreementPartitionCoefficientResponseApplicationState.APPLIED,
    );

  const showPublish = isDraft && coefficients !== undefined;
  const showRevert = isPublished && coefficients !== undefined && isInert;
  // Editing metadata and deleting are the only actions left in the kebab; the
  // lifecycle moves are labelled controls on the rail itself.
  const showMenu = !isLoading && !error && isDraft;

  const view = selectSharingAgreementLifecycleView(nextStep, agreement?.status);

  const publishAction: LifecycleSpineAction | undefined =
    showPublish && onPublishRequest
      ? { label: "Poner en vigor", onClick: onPublishRequest, disabledReason: publishDisabledReason }
      : undefined;

  const revertAction: LifecycleSpineAction | undefined =
    showRevert && onRevertRequest ? { label: "Volver a borrador", onClick: onRevertRequest } : undefined;

  // Stage 2 only: outside the generate-and-send span there is nothing to generate.
  const generateAction: LifecycleSpineAction | undefined =
    nextStep.kind === "GENERATE_AND_SEND" && onGenerateRequest
      ? {
          label: "Generar fichero",
          onClick: onGenerateRequest,
          disabledReason: nextStep.canGenerate
            ? undefined
            : "La planta no tiene CAU configurado. Sin él no se puede generar el fichero.",
        }
      : undefined;

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElement(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorElement(null);
  };

  const handleEditClick = () => {
    handleCloseMenu();
    onEdit?.();
  };

  const handleDeleteClick = () => {
    handleCloseMenu();
    onDeleteRequest?.();
  };


  const agreementName = agreement?.name || "Acuerdo de reparto";
  const cauLine = plant?.regulatoryCode ? `CAU: ${plant.regulatoryCode}` : "CAU no disponible";
  const isResolved = !isLoading && !error;

  /**
   * Identity and flow stop sharing one container. The agreement's own data lives
   * in the first card; where it sits in its regulatory cycle, and what to do next,
   * lives in the second. Mixing them into a single banner made neither readable.
   */
  const cardSx = {
    bgcolor: colors.background.paper,
    borderRadius: { xs: 0, sm: radii.large },
    border: "1px solid",
    borderColor: colors.divider,
    p: { xs: 2, sm: 3 },
  } as const;

  return (
    <>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Paper elevation={0} sx={cardSx}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                flexShrink: 0,
                borderRadius: radii.default,
                bgcolor: colors.brand.surface,
                color: colors.brand.main,
              }}
            >
              <HandshakeOutlinedIcon sx={{ fontSize: 22 }} />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                ref={headingRef}
                variant="h5"
                component="h1"
                tabIndex={-1}
                sx={{
                  color: colors.text.primary,
                  // Focused programmatically after publish/revert, so the ring is
                  // explicit rather than inherited.
                  "&:focus-visible": { outline: "2px solid", outlineColor: colors.brand.main, outlineOffset: "4px" },
                }}
              >
                {agreementName}
              </Typography>
              <Typography variant="body2" sx={{ color: colors.text.subtle }}>
                {cauLine}
              </Typography>
            </Box>

            {isResolved && <SharingAgreementStatusChip status={agreement?.status} tone="onLight" />}

            {showMenu && (
              <Box sx={{ flexShrink: 0 }}>
                <IconButton
                  onClick={handleOpenMenu}
                  aria-label="Más opciones del acuerdo"
                  sx={{ color: colors.text.subtle, "&:hover": { backgroundColor: colors.background.surface } }}
                >
                  <MoreVertIcon />
                </IconButton>
                <MenuTemplate anchorElement={anchorElement} onClose={handleCloseMenu}>
                  <Box sx={{ py: 1 }}>
                    <MenuItem onClick={handleEditClick}>
                      <EditOutlinedIcon sx={{ mr: 2, fontSize: 20, color: colors.text.subtle, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ color: colors.text.body, fontWeight: 500, textAlign: "left" }}>
                        Editar
                      </Typography>
                    </MenuItem>
                    <Divider sx={{ my: 1 }} />
                    <MenuItem
                      onClick={handleDeleteClick}
                      sx={{ "&:hover": { backgroundColor: colors.background.errorFaint } }}
                    >
                      <DeleteOutlineIcon sx={{ mr: 2, fontSize: 20, color: "error.main", flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ color: "error.main", fontWeight: 500, textAlign: "left" }}>
                        Eliminar
                      </Typography>
                    </MenuItem>
                  </Box>
                </MenuTemplate>
              </Box>
            )}
          </Box>

          {isResolved && (
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                columnGap: 3,
                rowGap: 0.5,
                mt: 1.5,
                pt: 1.5,
                borderTop: "1px solid",
                borderColor: colors.divider,
              }}
            >
              <Typography variant="caption" sx={{ color: colors.text.subtle }}>
                Creado el {formatCalendarDate(agreement?.createdAt)}
              </Typography>
              {agreement?.notes && (
                <Typography
                  variant="caption"
                  title={agreement.notes}
                  sx={{
                    color: colors.text.subtle,
                    // Visual clamp only — the full note stays in the DOM for
                    // assistive technology and in the title attribute for a pointer.
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 2,
                    overflow: "hidden",
                  }}
                >
                  {agreement.notes}
                </Typography>
              )}
            </Box>
          )}
        </Paper>

        {isResolved && (
          <Paper elevation={0} sx={cardSx}>
            <SharingAgreementLifecycleSpine
              view={view}
              generate={generateAction}
              publish={publishAction}
              revert={revertAction}
            />
          </Paper>
        )}
      </Box>
    </>
  );
};
