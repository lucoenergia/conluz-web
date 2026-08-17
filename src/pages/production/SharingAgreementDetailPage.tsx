import { useEffect, type FC } from "react";
import { Box } from "@mui/material";
import { useParams } from "react-router";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";
import { BreadCrumb } from "../../components/Breadcrumb";
import { EmptyState } from "../../components/EmptyState";
import { SharingAgreementDetailHeader } from "../../components/SharingAgreementDetailHeader";
import { SharingAgreementCoefficientSumCards } from "../../components/SharingAgreementCoefficientSumCards";
import { SharingAgreementCoefficientSet } from "../../components/SharingAgreementCoefficientSet";
import { SharingAgreementFilePanel } from "../../components/SharingAgreementFilePanel";
import { useErrorDispatch } from "../../context/error.context";
import { useSharingAgreementDetailData } from "./useSharingAgreementDetailData";

export const SharingAgreementDetailPage: FC = () => {
  const { plantId = "", sharingAgreementId = "" } = useParams();
  const errorDispatch = useErrorDispatch();
  const { agreement, plant, coefficients, isLoading, isNotFound, error } = useSharingAgreementDetailData(
    plantId,
    sharingAgreementId,
  );

  useEffect(() => {
    if (error) {
      errorDispatch("Ha habido un problema al cargar el acuerdo de reparto. Por favor, inténtalo más tarde");
    }
  }, [error, errorDispatch]);

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
            <SharingAgreementDetailHeader agreement={agreement} plant={plant} isLoading={isLoading} error={error} />
          </Box>

          {!isLoading && !error && (
            <Box sx={sxStyles.pageContainer}>
              <SharingAgreementCoefficientSumCards coefficients={coefficients} agreementStatus={agreement?.status} />
            </Box>
          )}

          {!isLoading && !error && (
            <Box sx={sxStyles.pageContainer}>
              <SharingAgreementCoefficientSet coefficients={coefficients} />
            </Box>
          )}

          {!isLoading && !error && (
            <Box sx={sxStyles.pageContainer}>
              <SharingAgreementFilePanel
                plantId={plantId}
                sharingAgreementId={sharingAgreementId}
                agreementStatus={agreement?.status}
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};
