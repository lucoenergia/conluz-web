import type { FC } from "react";
import { Box, Typography } from "@mui/material";
import { useParams } from "react-router";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";
import { BreadCrumb } from "../../components/Breadcrumb";

export const SharingAgreementsPage: FC = () => {
  const { plantId = "" } = useParams();

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

      <Box sx={sxStyles.pageContainer}>
        <Typography variant="h4">Acuerdos de Reparto</Typography>
      </Box>
    </Box>
  );
};
