import { radii, shadows, alphas, fontSizes, colors } from "../theme/tokens";
import { sxStyles } from "../theme/sx";
import { useState, useEffect, type FC } from "react";
import { Box, Button, TextField, Typography, Paper, Avatar, CircularProgress, Chip, Alert, Snackbar } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import BadgeIcon from "@mui/icons-material/Badge";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { BreadCrumb } from "../components/Breadcrumb";
import { useGetCurrentUser, useUpdateUser } from "../api/users/users";
import { useErrorDispatch } from "../context/error.context";
import { useActiveCommunityRole, useIsPlatformAdmin } from "../hooks/useActiveCommunityRole";
import { CommunityRole } from "../api/models";

export const ProfilePage: FC = () => {
  const { data: currentUser, isLoading, error, refetch } = useGetCurrentUser();
  const updateUser = useUpdateUser();
  const errorDispatch = useErrorDispatch();
  const isPlatformAdmin = useIsPlatformAdmin();
  const activeCommunityRole = useActiveCommunityRole();

  // Derive a display label from the new membership model: platform admins first,
  // then the role within the active community.
  const roleLabel = isPlatformAdmin
    ? "Administrador de plataforma"
    : activeCommunityRole === CommunityRole.COMMUNITY_ADMIN
      ? "Administrador de comunidad"
      : activeCommunityRole === CommunityRole.COMMUNITY_MEMBER
        ? "Socio"
        : "";

  const [formData, setFormData] = useState({
    name: "",
    dni: "",
    email: "",
    address: "",
    phone: "",
  });

  const [successMessage, setSuccessMessage] = useState(false);

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
    setFormData({ ...formData, [field]: event.target.value });
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors({ ...formErrors, [field]: false });
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
      };
      await updateUser.mutateAsync(
        { id: currentUser.id, data: updatedUserData },
        { onSuccess: () => { setSuccessMessage(true); refetch(); } }
      );
    } catch (error) {
      errorDispatch("Error al actualizar el perfil. Por favor, inténtalo de nuevo.");
      console.error("Error updating profile:", error);
    }
  };

  const handleCloseSuccessMessage = () => { setSuccessMessage(false); };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2, sm: 3 },
        p: { xs: 0, sm: 2, md: 3 },
        minHeight: "100vh",
        background: colors.background.default,
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      <Box sx={sxStyles.pageContainerFull}>
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: "Mi perfil", href: "#" },
          ]}
        />
      </Box>

      <Paper
        elevation={0}
        sx={(theme) => ({
          p: { xs: 2, sm: 3 },
          borderRadius: { xs: 0, sm: radii.large },
          background: theme.palette.primary.main,
          color: "white",
          mx: { xs: 0, sm: 0 },
          width: { xs: "100%", sm: "auto" },
        })}
      >
        <Box sx={sxStyles.flexRowCenter}>
          <Avatar sx={{ bgcolor: alphas.white.soft, width: 56, height: 56 }}>
            <PersonIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h4">Mi perfil</Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>Gestiona tu información personal</Typography>
          </Box>
        </Box>
      </Paper>

      <Box sx={sxStyles.pageContainerFull}>
        <Paper
          elevation={0}
          sx={[sxStyles.softPanel, { width: "100%", maxWidth: 800, margin: "0 auto" }]}
        >
          {isLoading && (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress sx={(theme) => ({ color: theme.palette.primary.main })} />
            </Box>
          )}

          {error && (
            <Typography sx={{ color: "error.main", textAlign: "center", p: 2 }}>
              Error al cargar los datos del usuario
            </Typography>
          )}

          {!isLoading && !error && (
            <Box component="form" onSubmit={handleSubmit} sx={sxStyles.flexColumnGap3}>
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
                <Chip
                  icon={<BadgeIcon />}
                  label={`Socio #${currentUser?.number || 0}`}
                  sx={(theme) => ({
                    fontSize: fontSizes.md,
                    fontWeight: 600,
                    backgroundColor: theme.palette.primary.main,
                    color: "white",
                    px: 1,
                    py: 2.5,
                    "& .MuiChip-icon": { color: "white" },
                  })}
                />
                {roleLabel && (
                  <Chip
                    icon={<AdminPanelSettingsIcon />}
                    label={roleLabel}
                    sx={{
                      fontSize: fontSizes.md,
                      fontWeight: 600,
                      backgroundColor: colors.success,
                      color: "white",
                      px: 1,
                      py: 2.5,
                      "& .MuiChip-icon": { color: "white" },
                    }}
                  />
                )}
              </Box>

              <TextField label="Nombre completo" error={formErrors.name} helperText={formErrors.name ? "Por favor, introduce tu nombre completo" : ""} value={formData.name} onChange={handleChange("name")} required fullWidth variant="outlined" />
              <TextField label="DNI/NIF" error={formErrors.dni} helperText={formErrors.dni ? "Por favor, introduce tu DNI/NIF" : ""} value={formData.dni} onChange={handleChange("dni")} required fullWidth variant="outlined" />
              <TextField label="Email" error={formErrors.email} helperText={formErrors.email ? "Por favor, introduce tu email" : ""} type="email" value={formData.email} onChange={handleChange("email")} required fullWidth variant="outlined" />
              <TextField label="Dirección" value={formData.address} onChange={handleChange("address")} fullWidth variant="outlined" />
              <TextField label="Número de teléfono" value={formData.phone} onChange={handleChange("phone")} fullWidth variant="outlined" />

              <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  sx={{
                    fontSize: fontSizes.lg,
                    fontWeight: 600,
                    boxShadow: shadows.medium,
                    px: 4,
                    "&:hover": { boxShadow: shadows.strong },
                  }}
                >
                  Guardar cambios
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>

      <Snackbar open={successMessage} autoHideDuration={4000} onClose={handleCloseSuccessMessage} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={handleCloseSuccessMessage} severity="success" sx={{ width: "100%", borderRadius: radii.default }}>
          Perfil actualizado correctamente
        </Alert>
      </Snackbar>
    </Box>
  );
};
