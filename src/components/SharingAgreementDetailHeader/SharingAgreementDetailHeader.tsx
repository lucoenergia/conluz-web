import { useState, type FC, type Ref } from "react";
import { Alert, Box, IconButton, Link, MenuItem, Typography, Divider } from "@mui/material";
import { Link as RouterLink } from "react-router";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import SolarPowerIcon from "@mui/icons-material/SolarPower";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementResponseStatus,
} from "../../api/models";
import type { PlantResponse, SharingAgreementResponse } from "../../api/models";
import { SharingAgreementStatusChip } from "../SharingAgreementStatusChip";
import {
  SharingAgreementNextStepBanner,
  type LifecycleActionHandlers,
} from "../SharingAgreementNextStepBanner";
import { MenuTemplate } from "../Menu/MenuTemplate";
import { DetailHeader, type DetailFact, type DetailKeyFacts } from "../DetailHeader";
import { formatKilowatts } from "../../utils/formatKilowatts";
import { formatCalendarDate, SHORT_CALENDAR_DATE } from "../../utils/formatCalendarDate";
import { colors, radii } from "../../theme/tokens";
import type { CoefficientSummable } from "../../pages/production/sharingAgreementCoefficientSums";
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
   * briefly show "Volver a borrador", since `[].every(...)` is vacuously true.
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
  onEditCoefficientsRequest?: () => void;
  onImportRequest?: () => void;
  onRecordDatesRequest?: () => void;
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
  onEditCoefficientsRequest,
  onImportRequest,
  onRecordDatesRequest,
}) => {
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const isDraft = agreement?.status === SharingAgreementResponseStatus.DRAFT;
  const isPublished = agreement?.status === SharingAgreementResponseStatus.PUBLISHED;
  const isResolved = !isLoading && !error;

  const isInert =
    coefficients !== undefined &&
    coefficients.every(
      (coefficient) =>
        coefficient.applicationState !== SharingAgreementPartitionCoefficientResponseApplicationState.APPLIED,
    );

  const showRevert = isPublished && coefficients !== undefined && isInert;

  /**
   * A published agreement whose coefficients all still lack an application date
   * distributes nothing. Production resolves coefficients by valid_from/valid_to
   * alone — the agreement's status plays no part — so "Vigente" on its own is
   * genuinely misleading here.
   *
   * Informational, not an error: nothing has gone wrong, there is simply a step
   * left. Styling it as a fault would misreport the state in the other direction.
   */
  const distributesNothing =
    isPublished && coefficients !== undefined && coefficients.length > 0 && isInert;

  // `PUT /sharing-agreements/{id}` no longer requires DRAFT — name, notes and
  // installed power can be corrected in any status. Deleting still requires it:
  // removing a published agreement would destroy the basis of past billing.
  const showMenu = isResolved && !!agreement;

  const view = selectSharingAgreementLifecycleView(nextStep, agreement?.status);

  /**
   * Which action belongs to the current step, and what it is called, is decided
   * by the selector. This map only binds each named intent to its handler —
   * there is no second copy of the publish rule down here any more.
   */
  const handlers: LifecycleActionHandlers = {
    EDIT_COEFFICIENTS: onEditCoefficientsRequest,
    IMPORT_FILE: onImportRequest,
    PUBLISH: onPublishRequest,
    DOWNLOAD_FILE: onGenerateRequest,
    RECORD_DATES: onRecordDatesRequest,
  };

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
  const plantId = agreement?.plantId || plant?.id;

  const keyFacts: DetailKeyFacts = [
    {
      label: "Potencia instalada",
      value: agreement?.installedPowerKw !== undefined ? formatKilowatts(agreement.installedPowerKw) : "-",
    },
    { label: "Creado el", value: formatCalendarDate(agreement?.createdAt, SHORT_CALENDAR_DATE) },
  ];

  const details: DetailFact[] = [
    { label: "CAU de la planta", value: plant?.regulatoryCode || "No disponible" },
    {
      label: "Notas internas",
      value: (
        <Box component="span" sx={{ color: agreement?.notes ? undefined : colors.text.subtle }}>
          {agreement?.notes || "Sin notas"}
        </Box>
      ),
      wide: true,
    },
  ];

  const menu = showMenu && (
    <>
      <IconButton
        onClick={handleOpenMenu}
        aria-label="Más opciones del acuerdo"
        sx={{
          color: colors.text.secondary,
          border: "1px solid",
          borderColor: colors.divider,
          borderRadius: radii.default,
          bgcolor: colors.background.paper,
          "&:hover": { backgroundColor: colors.background.surface },
        }}
      >
        <MoreVertIcon />
      </IconButton>
      <MenuTemplate anchorElement={anchorElement} onClose={handleCloseMenu}>
        <Box sx={{ py: 1 }}>
          {/* "Editar a mano" in the split section edits coefficients; this
              edits the agreement's own fields. Two different verbs on one
              screen need two different labels. */}
          <MenuItem onClick={handleEditClick}>
            <EditOutlinedIcon sx={{ mr: 2, fontSize: 20, color: colors.text.subtle, flexShrink: 0 }} />
            <Typography variant="body2" sx={{ color: colors.text.body, fontWeight: 500, textAlign: "left" }}>
              Editar datos del acuerdo
            </Typography>
          </MenuItem>
          {isDraft && [
            <Divider key="divider" sx={{ my: 1 }} />,
            <MenuItem
              key="delete"
              onClick={handleDeleteClick}
              sx={{ "&:hover": { backgroundColor: colors.background.errorFaint } }}
            >
              <DeleteOutlineIcon sx={{ mr: 2, fontSize: 20, color: "error.main", flexShrink: 0 }} />
              <Typography variant="body2" sx={{ color: "error.main", fontWeight: 500, textAlign: "left" }}>
                Eliminar
              </Typography>
            </MenuItem>,
          ]}
        </Box>
      </MenuTemplate>
    </>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 1.5, sm: 2.5 } }}>
      <DetailHeader
        icon={<HandshakeOutlinedIcon />}
        title={agreementName}
        titleRef={headingRef}
        status={<SharingAgreementStatusChip status={agreement?.status} tone="onLight" />}
        // The agreement belongs to a plant, and that plant is where its CAU,
        // its production and its other agreements live — so the line under the
        // title is the way back there, not a decorative restatement.
        subtitle={
          plant?.name && plantId ? (
            <Link
              component={RouterLink}
              to={`/production/${plantId}`}
              sx={{ color: "primary.main", fontWeight: 600, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
            >
              {plant.name}
            </Link>
          ) : undefined
        }
        subtitleIcon={plant?.name && plantId ? <SolarPowerIcon /> : undefined}
        keyFacts={keyFacts}
        details={details}
        menu={menu || undefined}
        isLoading={isLoading}
        error={error}
      />

      {isResolved && distributesNothing && (
        <Alert severity="info" icon={<InfoOutlinedIcon />}>
          <Box component="strong" sx={{ fontWeight: 600 }}>
            Vigente, pero todavía no reparte producción:
          </Box>{" "}
          registra las fechas de aplicación.
        </Alert>
      )}

      {isResolved && (
        <SharingAgreementNextStepBanner
          view={view}
          handlers={handlers}
          isClosed={view.isClosed}
          revert={
            showRevert && onRevertRequest
              ? { label: "Volver a borrador", onClick: onRevertRequest }
              : undefined
          }
        />
      )}

    </Box>
  );
};
