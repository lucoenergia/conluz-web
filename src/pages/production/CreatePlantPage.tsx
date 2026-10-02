import { radii, colors, alphas } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { type FC } from "react";
import { Box, Typography, Paper, Avatar } from "@mui/material";
import type { CreatePlantBody } from "../../api/models";
import { useNavigate } from "react-router";
import { useActiveCommunityResource } from "../../hooks/useActiveCommunityResource";
import { useCommunityActions } from "../../hooks/actions";
import { PlantForm, type PlantFormValues } from "../../components/PlantForm/PlantForm";
import { useErrorDispatch } from "../../context/error.context";
import { BreadCrumb } from "../../components/Breadcrumb";
import { CommunityScopeHeader } from "../../components/CommunityScopeHeader";
import { communityLabel, useActiveCommunityName } from "../../hooks/useActiveCommunityName";
import SolarPowerIcon from "@mui/icons-material/SolarPower";

export const CreatePlantPage: FC = () => {
  const navigate = useNavigate();
  const communityName = useActiveCommunityName();
  const errorDispatch = useErrorDispatch();
  const activeCommunity = useActiveCommunityResource();
  // The community answers "may this person create plants at all", which is what
  // the route guard enforces too; PlantForm bounds the choice to the supplies
  // whose own canCreatePlant is true.
  const { createPlant } = useCommunityActions().forCommunity(activeCommunity).actions;

  const handleSubmit = async (values: PlantFormValues) => {
    // The route guard has already established this; it only covers the render
    // before the community itself has arrived.
    if (!createPlant) return;
    const newPlant: CreatePlantBody = {
      providerCode: values.providerCode,
      regulatoryCode: values.regulatoryCode || undefined,
      name: values.name,
      address: values.address,
      description: values.description || undefined,
      totalPower: values.totalPower,
      connectionDate: values.connectionDate || undefined,
      supplyCode: values.supplyCode,
      inverterProvider: "HUAWEI",
    };

    // The action invalidates the plant list itself, so there is no refetch here.
    if (await createPlant.run(newPlant)) {
      navigate("/production");
    } else {
      errorDispatch("Ha habido un problema al crear una nueva planta. Por favor, inténtalo más tarde");
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
            { label: "Producción", href: "/production" },
            { label: "Nuevo", href: "/production/new" },
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
            <SolarPowerIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <CommunityScopeHeader name={communityName} tone="onBrand" />
            <Typography variant="h4" component="h1" sx={{ overflowWrap: "anywhere" }}>
              Crear planta en {communityLabel(communityName)}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Registra una nueva planta de producción en la comunidad energética
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
          <PlantForm handleSubmit={handleSubmit} disabled={!createPlant} />
        </Paper>
      </Box>
    </Box>
  );
};
