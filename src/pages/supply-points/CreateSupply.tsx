import { radii, alphas, colors } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { type FC } from "react";
import { Box, Typography, Paper, Avatar } from "@mui/material";
import type { CreateSupplyBody } from "../../api/models";
import { useNavigate } from "react-router";
import { SupplyForm, type SupplyFormValues } from "../../components/SupplyForm/SupplyForm";
import { useLoggedUser } from "../../context/logged-user.context";
import { useActiveCommunity } from "../../context/community.context";
import { useErrorDispatch } from "../../context/error.context";
import { useCommunityActions } from "../../hooks/actions";
import { useActiveCommunityResource } from "../../hooks/useActiveCommunityResource";
import { BreadCrumb } from "../../components/Breadcrumb";
import ElectricMeterIcon from "@mui/icons-material/ElectricMeter";

export const CreateSupplyPage: FC = () => {
  const navigate = useNavigate();
  const loggedUser = useLoggedUser();
  const activeCommunityId = useActiveCommunity();
  const errorDispatch = useErrorDispatch();
  const activeCommunity = useActiveCommunityResource();
  const { createSupply } = useCommunityActions().forCommunity(activeCommunity).actions;

  const handleSubmit = async ({ name, cups, address, addressRef, personalId }: SupplyFormValues) => {
    // The route guard has already established the caller may create here, so
    // this only covers the render before the community itself has arrived.
    if (!activeCommunityId || !createSupply) return;
    const newSupply: CreateSupplyBody = {
      name,
      code: cups ?? "",
      address: address ?? "",
      personalId: personalId || loggedUser?.personalId || "",
      // Optional since the backend accepts a supply without one; sending the
      // empty string instead would store a blank reference as if it were data.
      addressRef: addressRef || undefined,
      communityId: activeCommunityId,
    };
    const created = await createSupply.run(newSupply);
    if (created) {
      navigate("/supply-points");
    } else {
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
            <Typography variant="h4" component="h1">
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
          <SupplyForm handleSubmit={handleSubmit} showUserSelector={true} disabled={!createSupply} />
        </Paper>
      </Box>
    </Box>
  );
};
