import { useState, type FC } from "react";
import { Box, Button, Typography, Paper, Avatar } from "@mui/material";
import KeyIcon from "@mui/icons-material/Key";
import { useNavigate } from "react-router";
import { BreadCrumb } from "../../components/Breadcrumb";
import { PasswordInput } from "../../components/Forms/PasswordInput";

export const ChangePasswordPage: FC = () => {
  const [formErrors, setFormErrors] = useState<{
    currentPassword: boolean;
    newPassword: boolean;
    confirmPassword: boolean;
  }>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const navigate = useNavigate();

  const currentPasswordErrorMessage = "Por favor, introduce tu contraseña actual";
  const newPasswordErrorMessage = "Por favor, introduce tu nueva contraseña";
  const confirmPasswordErrorMessage = "Por favor, confirma tu nueva contraseña";
  const mismatchErrorMessage = "Las contraseñas no coinciden";

  const validateInput = (
    currentPassword?: string,
    newPassword?: string,
    confirmPassword?: string
  ): boolean => {
    const newErrors = {
      currentPassword: !currentPassword,
      newPassword: !newPassword,
      confirmPassword: !confirmPassword,
    };

    setFormErrors(newErrors);

    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      setPasswordMismatch(true);
      return false;
    }

    setPasswordMismatch(false);
    return !newErrors.currentPassword && !newErrors.newPassword && !newErrors.confirmPassword;
  };

  const handleSubmit = async (data: FormData) => {
    const currentPassword = data.get("currentPassword") as string;
    const newPassword = data.get("newPassword") as string;
    const confirmPassword = data.get("confirmPassword") as string;

    if (!validateInput(currentPassword, newPassword, confirmPassword)) return;

    try {
      // TODO: Add API call to change password when backend endpoint is ready
      // On success, navigate back to profile or home
      // navigate("/profile");
    } catch (error) {
      console.error("Error changing password:", error);
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
            { label: "Mi perfil", href: "/profile" },
            { label: "Cambiar contraseña", href: "#" },
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
            <KeyIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Cambiar contraseña
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Actualiza tu contraseña de acceso
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
            maxWidth: 600,
            margin: "0 auto",
          }}
        >
          <Box component="form" action={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box>
              <Typography
                sx={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#1e293b",
                  mb: 1,
                }}
              >
                Contraseña actual
              </Typography>
              <PasswordInput
                error={formErrors.currentPassword}
                helperText={formErrors.currentPassword ? currentPasswordErrorMessage : ""}
                id="currentPassword"
                name="currentPassword"
                placeholder="Introduce tu contraseña actual"
                autoComplete="current-password"
                required
                fullWidth
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    fontFamily: "Inter, sans-serif",
                    borderRadius: "6px",
                    "&:hover fieldset": {
                      borderColor: "#667eea",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#667eea",
                    },
                  },
                }}
              />
            </Box>

            <Box>
              <Typography
                sx={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#1e293b",
                  mb: 1,
                }}
              >
                Nueva contraseña
              </Typography>
              <PasswordInput
                error={formErrors.newPassword || passwordMismatch}
                helperText={formErrors.newPassword ? newPasswordErrorMessage : ""}
                id="newPassword"
                name="newPassword"
                placeholder="Introduce tu nueva contraseña"
                autoComplete="new-password"
                required
                fullWidth
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    fontFamily: "Inter, sans-serif",
                    borderRadius: "6px",
                    "&:hover fieldset": {
                      borderColor: "#667eea",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#667eea",
                    },
                  },
                }}
              />
            </Box>

            <Box>
              <Typography
                sx={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#1e293b",
                  mb: 1,
                }}
              >
                Repite la nueva contraseña
              </Typography>
              <PasswordInput
                error={formErrors.confirmPassword || passwordMismatch}
                helperText={
                  formErrors.confirmPassword
                    ? confirmPasswordErrorMessage
                    : passwordMismatch
                      ? mismatchErrorMessage
                      : ""
                }
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Repite tu nueva contraseña"
                autoComplete="new-password"
                required
                fullWidth
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    fontFamily: "Inter, sans-serif",
                    borderRadius: "6px",
                    "&:hover fieldset": {
                      borderColor: "#667eea",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#667eea",
                    },
                  },
                }}
              />
            </Box>

            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 2 }}>
              <Button
                variant="outlined"
                onClick={() => navigate(-1)}
                sx={{
                  textTransform: "none",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "0.9375rem",
                  fontWeight: 500,
                  borderRadius: "6px",
                  borderColor: "#667eea",
                  color: "#667eea",
                  px: 3,
                  "&:hover": {
                    borderColor: "#5568d3",
                    backgroundColor: "rgba(102, 126, 234, 0.04)",
                  },
                }}
              >
                Cancelar
              </Button>
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
                  px: 3,
                  "&:hover": {
                    boxShadow: "0 4px 8px 0 rgba(0,0,0,0.16)",
                  },
                }}
              >
                Cambiar contraseña
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};
