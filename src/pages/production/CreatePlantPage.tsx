import { radii, colors, alphas } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { type FC } from "react";
import { Box, Typography, Paper, Avatar } from "@mui/material";
import { useCreatePlant } from "../../api/plants/plants";
import type { CreatePlantBody } from "../../api/models";
import { useNavigate } from "react-router";
import { PlantForm, type PlantFormValues } from "../../components/PlantForm/PlantForm";
import { useErrorDispatch } from "../../context/error.context";
import { BreadCrumb } from "../../components/Breadcrumb";
import SolarPowerIcon from "@mui/icons-material/SolarPower";

export const CreatePlantPage: FC = () => {
  const navigate = useNavigate();
  const errorDispatch = useErrorDispatch();
  const createPlant = useCreatePlant();

  const handleSubmit = async (values: PlantFormValues) => {
    try {
      const newPlant = {
        code: values.code,
        name: values.name,
        address: values.address,
        description: values.description || undefined,
        totalPower: values.totalPower,
        connectionDate: values.connectionDate || undefined,
        supplyCode: values.supplyCode,
        inverterProvider: "HUAWEI",
      } as CreatePlantBody;

      const response = await createPlant.mutateAsync({ data: newPlant });
      if (response) {
        navigate("/production");
      } else {
        errorDispatch("Ha habido un problema al crear una nueva planta. Por favor, inténtalo más tarde");
      }
    } catch {
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
          <Box>
            <Typography variant="h4">
              Crear nueva planta
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
          <PlantForm handleSubmit={handleSubmit} />
        </Paper>
      </Box>
    </Box>
  );
};
