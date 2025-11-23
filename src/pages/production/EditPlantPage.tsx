import { type FC } from "react";
import { Box, Typography, Paper, Avatar } from "@mui/material";
import { useNavigate, useParams } from "react-router";
import type { UpdatePlantBody } from "../../api/models";
import { BreadCrumb } from "../../components/Breadcrumb";
import { PlantForm, type PlantFormValues } from "../../components/PlantForm/PlantForm";
import { useGetPlantById, useUpdatePlant } from "../../api/plants/plants";
import { useErrorDispatch } from "../../context/error.context";
import SolarPowerIcon from "@mui/icons-material/SolarPower";

export const EditPlantPage: FC = () => {
  const { plantId = "" } = useParams();
  const errorDispatch = useErrorDispatch();
  const navigate = useNavigate();
  const updatePlant = useUpdatePlant();

  const { data: plant, isLoading, error, refetch } = useGetPlantById(plantId);

  const handleSubmit = async (values: PlantFormValues) => {
    try {
      const updatedPlant = {
        code: values.code,
        name: values.name,
        address: values.address,
        description: values.description || undefined,
        totalPower: values.totalPower,
        connectionDate: values.connectionDate || undefined,
        supplyCode: values.supplyCode,
        inverterProvider: "HUAWEI",
      } as UpdatePlantBody;

      const response = await updatePlant.mutateAsync({ id: plantId, data: updatedPlant }, {});
      if (response) {
        refetch();
        navigate("/production");
      } else {
        errorDispatch("Ha habido un problema al editar la planta. Por favor, inténtalo más tarde");
      }
    } catch (e) {
      errorDispatch("Ha habido un problema al editar la planta. Por favor, inténtalo más tarde");
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
        background: "#f5f7fa",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      {/* Breadcrumb */}
      <Box sx={{ px: { xs: 2, sm: 0 }, width: "100%" }}>
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: "Producción", href: "/production" },
            { label: plant?.code ? plant.code : plantId, href: `/production/${plantId}` },
            { label: "Editar", href: "#" },
          ]}
        />
      </Box>

      {/* Header Section */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: { xs: 0, sm: 3 },
          background: "#667eea",
          color: "white",
          mx: { xs: 0, sm: 0 },
          width: { xs: "100%", sm: "auto" },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.2)",
              width: 56,
              height: 56,
            }}
          >
            <SolarPowerIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Editar planta
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              {plant?.name || "Cargando..."}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Form Section */}
      <Box sx={{ px: { xs: 2, sm: 0 }, width: "100%" }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: { xs: 2, sm: 3 },
            bgcolor: "white",
            boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
          }}
        >
          {!isLoading && !error && (
            <PlantForm
              initialValues={{
                code: plant?.code,
                name: plant?.name,
                address: plant?.address,
                description: plant?.description,
                totalPower: plant?.totalPower,
                connectionDate: plant?.connectionDate,
                supplyCode: plant?.supply?.code,
              }}
              handleSubmit={handleSubmit}
              selectedSupplyCode={plant?.supply?.code}
              disableSupplySelector={true}
            />
          )}
        </Paper>
      </Box>
    </Box>
  );
};
