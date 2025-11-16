import { useState, useEffect, type FC } from "react";
import { Box, Button, TextField, Typography, Paper, Avatar, CircularProgress, Chip, Alert, Snackbar } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import BadgeIcon from "@mui/icons-material/Badge";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { BreadCrumb } from "../components/Breadcrumb";
import { useGetCurrentUser, useUpdateUser } from "../api/users/users";
import { useErrorDispatch } from "../context/error.context";

export const ProfilePage: FC = () => {
  const { data: currentUser, isLoading, error, refetch } = useGetCurrentUser();
  const updateUser = useUpdateUser();
  const errorDispatch = useErrorDispatch();

  const [formData, setFormData] = useState({
    name: "",
    dni: "",
    email: "",
    address: "",
    phone: "",
  });

  const [successMessage, setSuccessMessage] = useState(false);

  // Update form data when user data is loaded
  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.fullName || "",
        dni: currentUser.personalId || "",
        email: currentUser.email || "",
        address: currentUser.address || "",
        phone: currentUser.phoneNumber || "",
      });
    }
  }, [currentUser]);

  const [formErrors, setFormErrors] = useState({
    name: false,
    dni: false,
    email: false,
    address: false,
    phone: false,
  });

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
    // Clear error when user starts typing
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors({
        ...formErrors,
        [field]: false,
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors = {
      name: !formData.name.trim(),
      dni: !formData.dni.trim(),
      email: !formData.email.trim(),
      address: false,
      phone: false,
    };

    setFormErrors(newErrors);
    return !newErrors.name && !newErrors.dni && !newErrors.email;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) return;

    if (!currentUser?.id) {
      errorDispatch("No se pudo obtener el ID del usuario");
      return;
    }

    try {
      const updatedUserData = {
        number: currentUser.number || 0,
        personalId: formData.dni,
        fullName: formData.name,
        address: formData.address || undefined,
        email: formData.email,
        phoneNumber: formData.phone || undefined,
        role: currentUser.role!,
      };

      await updateUser.mutateAsync(
        {
          id: currentUser.id,
          data: updatedUserData,
        },
        {
          onSuccess: () => {
            setSuccessMessage(true);
            refetch();
          },
        }
      );
    } catch (error) {
      errorDispatch("Error al actualizar el perfil. Por favor, inténtalo de nuevo.");
      console.error("Error updating profile:", error);
    }
  };

  const handleCloseSuccessMessage = () => {
    setSuccessMessage(false);
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
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: "Mi perfil", href: "#" },
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
              Mi perfil
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Gestiona tu información personal
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
            maxWidth: 800,
            margin: "0 auto",
          }}
        >
          {isLoading && (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress sx={{ color: "#667eea" }} />
            </Box>
          )}

          {error && (
            <Typography sx={{ color: "#ef4444", textAlign: "center", p: 2 }}>
              Error al cargar los datos del usuario
            </Typography>
          )}

          {!isLoading && !error && (
            <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Read-only fields as chips */}
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
              <Chip
                icon={<BadgeIcon />}
                label={`Socio #${currentUser?.number || 0}`}
                sx={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  backgroundColor: "#667eea",
                  color: "white",
                  px: 1,
                  py: 2.5,
                  "& .MuiChip-icon": {
                    color: "white",
                  },
                }}
              />
              <Chip
                icon={<AdminPanelSettingsIcon />}
                label={currentUser?.role || ""}
                sx={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  backgroundColor: "#10b981",
                  color: "white",
                  px: 1,
                  py: 2.5,
                  "& .MuiChip-icon": {
                    color: "white",
                  },
                }}
              />
            </Box>

            <TextField
              label="Nombre completo"
              error={formErrors.name}
              helperText={formErrors.name ? "Por favor, introduce tu nombre completo" : ""}
              value={formData.name}
              onChange={handleChange("name")}
              required
              fullWidth
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  "&:hover fieldset": {
                    borderColor: "#667eea",
                  },
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
              error={formErrors.dni}
              helperText={formErrors.dni ? "Por favor, introduce tu DNI/NIF" : ""}
              value={formData.dni}
              onChange={handleChange("dni")}
              required
              fullWidth
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  "&:hover fieldset": {
                    borderColor: "#667eea",
                  },
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
              error={formErrors.email}
              helperText={formErrors.email ? "Por favor, introduce tu email" : ""}
              type="email"
              value={formData.email}
              onChange={handleChange("email")}
              required
              fullWidth
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  "&:hover fieldset": {
                    borderColor: "#667eea",
                  },
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
              value={formData.address}
              onChange={handleChange("address")}
              fullWidth
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  "&:hover fieldset": {
                    borderColor: "#667eea",
                  },
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
              value={formData.phone}
              onChange={handleChange("phone")}
              fullWidth
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  "&:hover fieldset": {
                    borderColor: "#667eea",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#667eea",
                  },
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: "#667eea",
                },
              }}
            />

            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                sx={{
                  textTransform: "none",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  borderRadius: "6px",
                  background: "#667eea",
                  boxShadow: "0 2px 4px 0 rgba(0,0,0,0.12)",
                  px: 4,
                  "&:hover": {
                    boxShadow: "0 4px 8px 0 rgba(0,0,0,0.16)",
                  },
                }}
              >
                Guardar cambios
              </Button>
            </Box>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Success Snackbar */}
      <Snackbar
        open={successMessage}
        autoHideDuration={4000}
        onClose={handleCloseSuccessMessage}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSuccessMessage}
          severity="success"
          sx={{
            width: "100%",
            fontFamily: "Inter, sans-serif",
            borderRadius: "6px",
          }}
        >
          Perfil actualizado correctamente
        </Alert>
      </Snackbar>
    </Box>
  );
};
