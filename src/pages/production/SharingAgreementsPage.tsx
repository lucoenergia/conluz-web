import { useEffect, type FC } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useParams } from "react-router";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";
import { BreadCrumb } from "../../components/Breadcrumb";
import { EmptyState } from "../../components/EmptyState";
import { useErrorDispatch } from "../../context/error.context";
import { useSharingAgreementsData } from "./useSharingAgreementsData";

export const SharingAgreementsPage: FC = () => {
  const { plantId = "" } = useParams();
  const errorDispatch = useErrorDispatch();
  const { isLoading, isNotFound, error } = useSharingAgreementsData(plantId);

  useEffect(() => {
    if (error) {
      errorDispatch("Ha habido un problema al cargar los acuerdos de reparto. Por favor, inténtalo más tarde");
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
      <Box sx={sxStyles.pageContainer}>
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: "Producción", href: "/production" },
            { label: "Planta", href: `/production/${plantId}` },
            { label: "Acuerdos de Reparto", href: "#" },
          ]}
        />
      </Box>

      {isNotFound ? (
        <Box sx={sxStyles.pageContainer}>
          <EmptyState
            icon={SearchOffIcon}
            title="Planta no encontrada"
            subtitle="Esta planta no existe o no tienes acceso a su comunidad."
          />
        </Box>
      ) : (
        <>
          <Box sx={sxStyles.pageContainer}>
            <Typography variant="h4">Acuerdos de Reparto</Typography>
          </Box>

          {isLoading && (
            <Box sx={{ ...sxStyles.pageContainer, display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};
