import { useEffect, useState, type FC } from "react";
import { Box } from "@mui/material";
import { useNavigate, useParams } from "react-router";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";
import { BreadCrumb } from "../../components/Breadcrumb";
import { EmptyState } from "../../components/EmptyState";
import { SharingAgreementDetailHeader } from "../../components/SharingAgreementDetailHeader";
import { SharingAgreementCoefficientSet } from "../../components/SharingAgreementCoefficientSet";
import { SharingAgreementNextStepPanel } from "../../components/SharingAgreementNextStepPanel";
import { SharingAgreementFilePanel } from "../../components/SharingAgreementFilePanel";
import { SharingAgreementFormDialog, type SharingAgreementFormValues } from "../../components/SharingAgreementFormDialog";
import { DeleteSharingAgreementConfirmationModal } from "../../components/Modals/DeleteSharingAgreementConfirmationModal";
import { useErrorDispatch } from "../../context/error.context";
import { useSharingAgreementDetailData } from "./useSharingAgreementDetailData";
import { useSharingAgreementMutations } from "./useSharingAgreementMutations";
import { selectSharingAgreementNextStep } from "./selectSharingAgreementNextStep";

export const SharingAgreementDetailPage: FC = () => {
  const { plantId = "", sharingAgreementId = "" } = useParams();
  const navigate = useNavigate();
  const errorDispatch = useErrorDispatch();
  const { agreement, plant, coefficients, coefficientsData, isLoading, isNotFound, error } = useSharingAgreementDetailData(
    plantId,
    sharingAgreementId,
  );
  const { updateAgreement, deleteAgreement, isUpdating, isDeleting } = useSharingAgreementMutations(plantId);
  const nextStep = selectSharingAgreementNextStep(agreement, coefficientsData, plant?.regulatoryCode ?? undefined);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);

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
              onEdit={() => setIsEditDialogOpen(true)}
              onDeleteRequest={() => setIsDeleteConfirmationOpen(true)}
            />
          </Box>

          {!isLoading && !error && nextStep.kind !== "NONE" && (
            <Box sx={sxStyles.pageContainer}>
              <SharingAgreementNextStepPanel nextStep={nextStep} />
            </Box>
          )}

          {!isLoading && !error && (
            <Box sx={sxStyles.pageContainer}>
              <SharingAgreementCoefficientSet
                plantId={plantId}
                sharingAgreementId={sharingAgreementId}
                coefficients={coefficients}
                installedPowerKw={agreement?.installedPowerKw}
                agreementStatus={agreement?.status}
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
              />
            </Box>
          )}
        </>
      )}

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
        agreementName={agreement?.name || "Acuerdo de reparto"}
        isDeleting={isDeleting}
        onCancel={() => setIsDeleteConfirmationOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </Box>
  );
};
