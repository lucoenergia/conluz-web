import { type FC } from "react";
import { Box, Typography, Paper, Avatar } from "@mui/material";
import { useCreateSupply } from "../api/supplies/supplies";
import type { CreateSupplyBody } from "../api/models";
import { useNavigate } from "react-router";
import { SupplyForm, type SupplyFormValues } from "../components/SupplyForm/SupplyForm";
import { useLoggedUser } from "../context/logged-user.context";
import { useErrorDispatch } from "../context/error.context";
import { EnhancedBreadCrumb } from "../components/Breadcrumb";
import ElectricMeterIcon from "@mui/icons-material/ElectricMeter";

export const CreateSupplyPage: FC = () => {
  const navigate = useNavigate();
  const loggedUser = useLoggedUser();
  const errorDispatch = useErrorDispatch();
  const createSupply = useCreateSupply();

  const handleSubmit = async ({ name, cups, address, partitionCoefficient, addressRef, personalId }: SupplyFormValues) => {
    try {
      const newSupply = {
        name,
        code: cups,
        address,
        partitionCoefficient,
        personalId: personalId || loggedUser?.personalId,
        addressRef,
      } as CreateSupplyBody;
      const response = await createSupply.mutateAsync({ data: newSupply });
      if (response) {
        navigate("/supply-points");
      } else {
        errorDispatch("Hay habido un problema al crear un nuevo punto de suministro. Por favor, inténtalo más tarde");
      }
    } catch (e) {
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
        background: "#f5f7fa",
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      {/* Breadcrumb */}
      <Box sx={{ px: { xs: 2, sm: 0 }, width: "100%" }}>
        <EnhancedBreadCrumb
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
            <ElectricMeterIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Crear nuevo punto de suministro
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Registra un nuevo punto de suministro en la comunidad energética
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
            width: "100%",
          }}
        >
          <SupplyForm handleSubmit={handleSubmit} showUserSelector={true} />
        </Paper>
      </Box>
    </Box>
  );
};
