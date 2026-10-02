import { radii, shadows, alphas, fontSizes, colors } from "../theme/tokens";
import { sxStyles } from "../theme/sx";
import { useState, useEffect, type FC } from "react";
import { Box, Button, TextField, Typography, Paper, Avatar, CircularProgress, Chip, Alert, Snackbar } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import BadgeIcon from "@mui/icons-material/Badge";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { BreadCrumb } from "../components/Breadcrumb";
import { useGetCurrentUser } from "../api/users/users";
import { useErrorDispatch } from "../context/error.context";
import { useProfileActions } from "../hooks/actions";
import { useActiveCommunityRoleLabel } from "../hooks/permissions";

export const ProfilePage: FC = () => {
  const { data: currentUser, isLoading, error } = useGetCurrentUser();
  const { actions } = useProfileActions();
  const errorDispatch = useErrorDispatch();
  const roleLabel = useActiveCommunityRoleLabel();

  // Only what PUT /users/profile accepts. Name, DNI and member number identify
  // the member to the community and to the distributor, so they are changed
  // administratively through PUT /users/{userId} and are shown here read-only.
  const [formData, setFormData] = useState({
    email: "",
    address: "",
    phone: "",
  });

  const [successMessage, setSuccessMessage] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setFormData({
        email: currentUser.email || "",
        address: currentUser.address || "",
        phone: currentUser.phoneNumber || "",
      });
    }
  }, [currentUser]);

  const [formErrors, setFormErrors] = useState({
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
      email: !formData.email.trim(),
      address: false,
      phone: false,
    };
    setFormErrors(newErrors);
    return !newErrors.email;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    // Omitting address or phoneNumber is how the endpoint clears them, which
    // is what an emptied field means. The action refreshes the signed-in user
    // itself, so there is nothing to refetch here.
    const saved = await actions.save.run({
      email: formData.email,
      address: formData.address || undefined,
      phoneNumber: formData.phone || undefined,
    });

    if (saved) {
      setSuccessMessage(true);
    } else {
      errorDispatch("Error al actualizar el perfil. Por favor, inténtalo de nuevo.");
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
            <Typography variant="h4" component="h1">Mi perfil</Typography>
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
                      backgroundColor: colors.success.main,
                      color: "white",
                      px: 1,
                      py: 2.5,
                      "& .MuiChip-icon": { color: "white" },
                    }}
                  />
                )}
              </Box>

              <TextField label="Nombre completo" value={currentUser?.fullName ?? ""} slotProps={{ input: { readOnly: true } }} fullWidth variant="outlined" />
              <TextField label="DNI/NIF" value={currentUser?.personalId ?? ""} slotProps={{ input: { readOnly: true } }} fullWidth variant="outlined" />
              <Typography variant="body2" sx={{ color: colors.text.subtle, mt: -1 }}>
                Nombre, DNI y número de socio te identifican ante la comunidad y la distribuidora.
                Para cambiarlos, contacta con la administración de tu comunidad.
              </Typography>

              <TextField label="Email" error={formErrors.email} helperText={formErrors.email ? "Por favor, introduce tu email" : ""} type="email" value={formData.email} onChange={handleChange("email")} required fullWidth variant="outlined" />
              <TextField label="Dirección" value={formData.address} onChange={handleChange("address")} fullWidth variant="outlined" />
              <TextField label="Número de teléfono" value={formData.phone} onChange={handleChange("phone")} fullWidth variant="outlined" />

              <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={actions.save.isPending}
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
