import { type FC, useState, useEffect } from "react";
import { Box, Typography, Paper, Avatar, TextField, Button, CircularProgress, Alert } from "@mui/material";
import { useNavigate, useParams } from "react-router";
import type { UpdateUserBody } from "../api/models";
import { BreadCrumb } from "../components/Breadcrumb";
import { useGetUserById, useUpdateUser } from "../api/users/users";
import { useErrorDispatch } from "../context/error.context";
import PersonIcon from "@mui/icons-material/Person";

export const EditPartnerPage: FC = () => {
  const { partnerId = "" } = useParams();
  const errorDispatch = useErrorDispatch();
  const navigate = useNavigate();
  const updateUser = useUpdateUser();

  // Fetch the specific partner by ID
  const { data: partnerData, isLoading, error } = useGetUserById(partnerId);

  const [formData, setFormData] = useState({
    fullName: "",
    personalId: "",
    email: "",
    address: "",
    phoneNumber: "",
  });

  useEffect(() => {
    if (partnerData) {
      setFormData({
        fullName: partnerData.fullName || "",
        personalId: partnerData.personalId || "",
        email: partnerData.email || "",
        address: partnerData.address || "",
        phoneNumber: partnerData.phoneNumber || "",
      });
    }
  }, [partnerData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedUser = {
        number: partnerData?.number,
        personalId: formData.personalId,
        fullName: formData.fullName,
        address: formData.address,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
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
        overflow: "hidden",
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
            <PersonIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Editar socio
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              {partnerData?.fullName || "Cargando..."}
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
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <TextField
                label="Nombre"
                variant="outlined"
                fullWidth
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "&.Mui-focused fieldset": {
                      borderColor: "#667eea",
                    },
                  },
                  "& .MuiInputLabel-root.Mui-focused": {
                    color: "#667eea",
                  },
                }}
              />

              <TextField
                label="DNI/NIF"
                variant="outlined"
                fullWidth
                required
                value={formData.personalId}
                onChange={(e) => setFormData({ ...formData, personalId: e.target.value })}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "&.Mui-focused fieldset": {
                      borderColor: "#667eea",
                    },
                  },
                  "& .MuiInputLabel-root.Mui-focused": {
                    color: "#667eea",
                  },
                }}
              />

              <TextField
                label="Email"
                variant="outlined"
                fullWidth
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "&.Mui-focused fieldset": {
                      borderColor: "#667eea",
                    },
                  },
                  "& .MuiInputLabel-root.Mui-focused": {
                    color: "#667eea",
                  },
                }}
              />

              <TextField
                label="Dirección"
                variant="outlined"
                fullWidth
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "&.Mui-focused fieldset": {
                      borderColor: "#667eea",
                    },
                  },
                  "& .MuiInputLabel-root.Mui-focused": {
                    color: "#667eea",
                  },
                }}
              />

              <TextField
                label="Número de teléfono"
                variant="outlined"
                fullWidth
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "&.Mui-focused fieldset": {
                      borderColor: "#667eea",
                    },
                  },
                  "& .MuiInputLabel-root.Mui-focused": {
                    color: "#667eea",
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={updateUser.isPending}
                sx={{
                  mt: 2,
                  py: 1.5,
                  background: "#667eea",
                  textTransform: "none",
                  fontSize: "1rem",
                  fontWeight: 600,
                  "&:hover": {
                    background: "linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)",
                  },
                }}
              >
                {updateUser.isPending ? <CircularProgress size={24} color="inherit" /> : "Guardar cambios"}
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </Box>
  );
};
