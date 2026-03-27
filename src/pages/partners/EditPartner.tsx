import { type FC } from "react";
import { Box, Typography, Paper, Avatar, CircularProgress, Alert } from "@mui/material";
import { useNavigate, useParams } from "react-router";
import type { UpdateUserBody } from "../../api/models";
import { BreadCrumb } from "../../components/Breadcrumb";
import { useGetUserById, useUpdateUser } from "../../api/users/users";
import { useErrorDispatch } from "../../context/error.context";
import { PartnerForm, type PartnerFormValues } from "../../components/PartnerForm/PartnerForm";
import PersonIcon from "@mui/icons-material/Person";

export const EditPartnerPage: FC = () => {
  const { partnerId = "" } = useParams();
  const errorDispatch = useErrorDispatch();
  const navigate = useNavigate();
  const updateUser = useUpdateUser();

  const { data: partnerData, isLoading, error } = useGetUserById(partnerId);

  const handleSubmit = async ({ fullName, personalId, email, address, phoneNumber }: PartnerFormValues) => {
    try {
      const updatedUser = {
        number: partnerData?.number,
        personalId,
        fullName,
        address,
        email,
        phoneNumber,
        role: partnerData?.role,
      } as UpdateUserBody;

      const response = await updateUser.mutateAsync({ id: partnerId, data: updatedUser }, {});
      if (response) {
        navigate("/partners");
      } else {
        errorDispatch("Ha habido un problema al editar el socio. Por favor, inténtalo más tarde");
      }
    } catch (e) {
      errorDispatch("Ha habido un problema al editar el socio. Por favor, inténtalo más tarde");
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !partnerData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">No se pudo cargar la información del socio</Alert>
      </Box>
    );
  }

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
        boxSizing: "border-box",
      }}
    >
      {/* Breadcrumb */}
      <Box sx={{ px: { xs: 2, sm: 0 }, width: "100%" }}>
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: "Socios", href: "/partners" },
            { label: partnerData?.fullName || partnerId, href: "#" },
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
            <PersonIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Editar socio
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              {partnerData?.fullName}
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
          <PartnerForm
            mode="edit"
            initialValues={{
              fullName: partnerData.fullName || "",
              personalId: partnerData.personalId || "",
              email: partnerData.email || "",
              address: partnerData.address || "",
              phoneNumber: partnerData.phoneNumber || "",
            }}
            handleSubmit={handleSubmit}
            isPending={updateUser.isPending}
            submitLabel="Guardar cambios"
          />
        </Paper>
      </Box>
    </Box>
  );
};
