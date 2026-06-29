import { radii, alphas, colors } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { type FC } from "react";
import { Box, Typography, Paper, Avatar } from "@mui/material";
import { useCreateSupply } from "../../api/supplies/supplies";
import type { CreateSupplyBody } from "../../api/models";
import { useNavigate } from "react-router";
import { SupplyForm, type SupplyFormValues } from "../../components/SupplyForm/SupplyForm";
import { useLoggedUser } from "../../context/logged-user.context";
import { useActiveCommunity } from "../../context/community.context";
import { useErrorDispatch } from "../../context/error.context";
import { BreadCrumb } from "../../components/Breadcrumb";
import ElectricMeterIcon from "@mui/icons-material/ElectricMeter";

export const CreateSupplyPage: FC = () => {
  const navigate = useNavigate();
  const loggedUser = useLoggedUser();
  const activeCommunityId = useActiveCommunity();
  const errorDispatch = useErrorDispatch();
  const createSupply = useCreateSupply();

  const handleSubmit = async ({ name, cups, address, partitionCoefficient, addressRef, personalId }: SupplyFormValues) => {
    if (!activeCommunityId) return;
    try {
      const newSupply: CreateSupplyBody = {
        name,
        code: cups ?? "",
        address: address ?? "",
        partitionCoefficient,
        personalId: personalId || loggedUser?.personalId || "",
        addressRef: addressRef ?? "",
        communityId: activeCommunityId,
      };
      const response = await createSupply.mutateAsync({ data: newSupply });
      if (response) {
        navigate("/supply-points");
      } else {
        errorDispatch("Hay habido un problema al crear un nuevo punto de suministro. Por favor, inténtalo más tarde");
      }
    } catch {
      errorDispatch("Hay habido un problema al crear un nuevo punto de suministro. Por favor, inténtalo más tarde");
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
        overflow: "hidden",
      }}
    >
      {/* Breadcrumb */}
      <Box sx={sxStyles.pageContainerFull}>
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: "Puntos de Suministro", href: "/supply-points" },
            { label: "Nuevo", href: "/supply-points/new" },
          ]}
        />
      </Box>

      {/* Header Section */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: { xs: 0, sm: radii.large },
          background: (theme) => theme.palette.primary.main,
          color: "white",
          mx: { xs: 0, sm: 0 },
          width: { xs: "100%", sm: "auto" },
        }}
      >
        <Box sx={sxStyles.flexRowCenter}>
          <Avatar
            sx={{
              bgcolor: alphas.white.soft,
              width: 56,
              height: 56,
            }}
          >
            <ElectricMeterIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h4">
              Crear nuevo punto de suministro
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Registra un nuevo punto de suministro en la comunidad energética
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Form Section */}
      <Box sx={sxStyles.pageContainerFull}>
        <Paper
          elevation={0}
          sx={[sxStyles.softPanel, { width: { xs: "100%", sm: "auto" } }]}
        >
          <SupplyForm handleSubmit={handleSubmit} showUserSelector={true} disabled={!activeCommunityId} />
        </Paper>
      </Box>
    </Box>
  );
};
