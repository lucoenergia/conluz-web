import { useEffect, useRef, useState, type FC } from "react";
import { Box } from "@mui/material";
import { useNavigate, useParams } from "react-router";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";
import { BreadCrumb } from "../../components/Breadcrumb";
import { EmptyState } from "../../components/EmptyState";
import { ActionStatus } from "../../components/ActionStatus";
import { SharingAgreementDetailHeader } from "../../components/SharingAgreementDetailHeader";
import { SharingAgreementCoefficientSet } from "../../components/SharingAgreementCoefficientSet";
import { SharingAgreementFilePanel } from "../../components/SharingAgreementFilePanel";
import { SharingAgreementUploadDialog } from "../../components/SharingAgreementUploadDialog";
import { SharingAgreementFormDialog, type SharingAgreementFormValues } from "../../components/SharingAgreementFormDialog";
import { DeleteSharingAgreementConfirmationModal } from "../../components/Modals/DeleteSharingAgreementConfirmationModal";
import { PublishSharingAgreementConfirmationModal } from "../../components/Modals/PublishSharingAgreementConfirmationModal";
import { RevertSharingAgreementToDraftConfirmationModal } from "../../components/Modals/RevertSharingAgreementToDraftConfirmationModal";
import { useErrorDispatch } from "../../context/error.context";
import { useSharingAgreementDetailData } from "./useSharingAgreementDetailData";
import { useSharingAgreementMutations } from "./useSharingAgreementMutations";
import { selectSharingAgreementNextStep } from "./selectSharingAgreementNextStep";
import {
  COEFFICIENT_SCALE,
  computeSharingAgreementCoefficientSums,
  formatCoefficientPercentage,
} from "./sharingAgreementCoefficientSums";

export const SharingAgreementDetailPage: FC = () => {
  const { plantId = "", sharingAgreementId = "" } = useParams();
  const navigate = useNavigate();
  const errorDispatch = useErrorDispatch();
  const { agreement, plant, coefficients, coefficientsData, isLoading, isNotFound, error } = useSharingAgreementDetailData(
    plantId,
    sharingAgreementId,
  );
  const {
    updateAgreement,
    deleteAgreement,
    publishAgreement,
    revertAgreementToDraft,
    isUpdating,
    isDeleting,
    isPublishing,
    isReverting,
  } = useSharingAgreementMutations(plantId);
  const nextStep = selectSharingAgreementNextStep(agreement, coefficientsData, plant?.regulatoryCode ?? undefined);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [isPublishConfirmationOpen, setIsPublishConfirmationOpen] = useState(false);
  const [isRevertConfirmationOpen, setIsRevertConfirmationOpen] = useState(false);
  // Owned here rather than in the file panel: the lifecycle rail offers the same
  // action for stage 2, so both entry points need one source of truth.
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  // Owned here rather than in the file panel, for the same reason the generate
  // dialog is: importing a TXT is a way of authoring coefficients, and more than
  // one surface on this page offers it.
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  // A nonce, not a boolean: "empezar a editar" is a repeatable request with no
  // closed state of its own, and the editor's seeding logic has to stay inside
  // the coefficient set, which owns the rows.
  const [editCoefficientsRequestId, setEditCoefficientsRequestId] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  const agreementName = agreement?.name || "Acuerdo de reparto";
  const { fileSumUnits } = computeSharingAgreementCoefficientSums(coefficients);
  const fileSumLabel = formatCoefficientPercentage(fileSumUnits / COEFFICIENT_SCALE);

  useEffect(() => {
    if (error) {
      errorDispatch("Ha habido un problema al cargar el acuerdo de reparto. Por favor, inténtalo más tarde");
    }
  }, [error, errorDispatch]);

  const handleEditSubmit = async (values: SharingAgreementFormValues) => {
    const success = await updateAgreement(sharingAgreementId, values);
    if (success) setIsEditDialogOpen(false);
  };

  const handleDeleteConfirm = async () => {
    const success = await deleteAgreement(sharingAgreementId);
    if (success) navigate(`/production/${plantId}/sharing-agreements`);
  };

  /**
   * The control that opened the dialog unmounts on success — the agreement has
   * changed status, so the rail now offers a different action. Without this,
   * closing the dialog drops focus to `<body>` and a keyboard user loses their
   * place at the end of the most consequential action on the page.
   */
  const returnFocusToHeading = () => headingRef.current?.focus();

  const handlePublishConfirm = async () => {
    const success = await publishAgreement(sharingAgreementId);
    if (success) {
      setIsPublishConfirmationOpen(false);
      setAnnouncement(`El acuerdo «${agreementName}» está en vigor.`);
      returnFocusToHeading();
    }
  };

  const handleRevertConfirm = async () => {
    const success = await revertAgreementToDraft(sharingAgreementId);
    if (success) {
      setIsRevertConfirmationOpen(false);
      setAnnouncement(`El acuerdo «${agreementName}» ha vuelto a borrador. Sus coeficientes se pueden editar de nuevo.`);
      returnFocusToHeading();
    }
  };

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
      }}
    >
      <ActionStatus message={announcement} />

      <Box sx={{ ...sxStyles.pageContainer, pt: { xs: 2, sm: 0 } }}>
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: "Producción", href: "/production" },
            { label: "Planta", href: `/production/${plantId}` },
            { label: "Acuerdos de Reparto", href: `/production/${plantId}/sharing-agreements` },
            { label: agreement?.name || "Detalle", href: "#" },
          ]}
        />
      </Box>

      {isNotFound ? (
        <Box sx={sxStyles.pageContainer}>
          <EmptyState
            icon={SearchOffIcon}
            title="Acuerdo no encontrado"
            subtitle="Este acuerdo de reparto no existe o no tienes acceso a su comunidad."
          />
        </Box>
      ) : (
        <>
          <Box sx={sxStyles.pageContainer}>
            <SharingAgreementDetailHeader
              agreement={agreement}
              plant={plant}
              isLoading={isLoading}
              error={error}
              coefficients={coefficientsData}
              nextStep={nextStep}
              headingRef={headingRef}
              onEdit={() => setIsEditDialogOpen(true)}
              onDeleteRequest={() => setIsDeleteConfirmationOpen(true)}
              onPublishRequest={() => setIsPublishConfirmationOpen(true)}
              onRevertRequest={() => setIsRevertConfirmationOpen(true)}
              onGenerateRequest={() => setIsGenerateDialogOpen(true)}
              onEditCoefficientsRequest={() => setEditCoefficientsRequestId((id) => id + 1)}
              onImportRequest={() => setIsUploadDialogOpen(true)}
            />
          </Box>

          {!isLoading && !error && (
            <Box sx={sxStyles.pageContainer}>
              <SharingAgreementCoefficientSet
                plantId={plantId}
                sharingAgreementId={sharingAgreementId}
                coefficients={coefficients}
                installedPowerKw={agreement?.installedPowerKw}
                agreementStatus={agreement?.status}
                editRequestId={editCoefficientsRequestId}
              />
            </Box>
          )}

          {!isLoading && !error && (
            <Box sx={sxStyles.pageContainer}>
              <SharingAgreementFilePanel
                plantId={plantId}
                sharingAgreementId={sharingAgreementId}
                agreement={agreement}
                coefficients={coefficients}
                plantRegulatoryCode={plant?.regulatoryCode ?? undefined}
                isGenerateDialogOpen={isGenerateDialogOpen}
                onGenerateDialogOpenChange={setIsGenerateDialogOpen}
                onImportRequest={() => setIsUploadDialogOpen(true)}
              />
            </Box>
          )}
        </>
      )}

      <SharingAgreementUploadDialog
        isOpen={isUploadDialogOpen}
        plantId={plantId}
        sharingAgreementId={sharingAgreementId}
        regulatoryCode={plant?.regulatoryCode ?? undefined}
        onClose={() => setIsUploadDialogOpen(false)}
      />

      {isEditDialogOpen && agreement && (
        <SharingAgreementFormDialog
          key={sharingAgreementId}
          isOpen
          mode="edit"
          initialValues={{
            name: agreement.name,
            notes: agreement.notes ?? undefined,
            installedPowerKw: agreement.installedPowerKw,
          }}
          hasCoefficients={coefficients.length > 0}
          isSubmitting={isUpdating}
          onCancel={() => setIsEditDialogOpen(false)}
          onSubmit={handleEditSubmit}
        />
      )}

      <DeleteSharingAgreementConfirmationModal
        isOpen={isDeleteConfirmationOpen}
        agreementName={agreementName}
        isDeleting={isDeleting}
        onCancel={() => setIsDeleteConfirmationOpen(false)}
        onConfirm={handleDeleteConfirm}
      />

      <PublishSharingAgreementConfirmationModal
        isOpen={isPublishConfirmationOpen}
        agreementName={agreementName}
        fileSumLabel={fileSumLabel}
        coefficientCount={coefficients.length}
        isPublishing={isPublishing}
        onCancel={() => setIsPublishConfirmationOpen(false)}
        onConfirm={handlePublishConfirm}
      />

      <RevertSharingAgreementToDraftConfirmationModal
        isOpen={isRevertConfirmationOpen}
        agreementName={agreementName}
        isReverting={isReverting}
        onCancel={() => setIsRevertConfirmationOpen(false)}
        onConfirm={handleRevertConfirm}
      />
    </Box>
  );
};
