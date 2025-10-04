import { Box, Button, Link, TextField, Typography, Paper, Avatar } from "@mui/material";
import { useState, type FC } from "react";
import LockResetIcon from "@mui/icons-material/LockReset";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Link as RouterLink } from "react-router";

export const ForgotPassword: FC = () => {
  const [formError, setFormError] = useState<boolean>(false);
  const missingEmail = "Por favor, introduce tu email";

  const handleSubmit = async (data: FormData) => {
    const id = data.get("email")?.toString().trim();
    const newError = !id;

    setFormError(newError);
    if (newError) return;
    // TODO: Add backend call when method exists
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        p: { xs: 2, sm: 3 },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 480,
          width: "100%",
          borderRadius: 3,
          boxShadow: "0 8px 32px 0 rgba(0,0,0,0.2)",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            p: { xs: 3, sm: 4 },
            textAlign: "center",
          }}
        >
          <Avatar
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.2)",
              width: 64,
              height: 64,
              margin: "0 auto 16px",
            }}
          >
            <LockResetIcon sx={{ fontSize: 36 }} />
          </Avatar>
          <Typography
            variant="h4"
            sx={{
              fontFamily: "Inter, sans-serif",
              fontWeight: 700,
              mb: 1,
            }}
          >
            ¿Olvidaste tu contraseña?
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontFamily: "Inter, sans-serif",
              opacity: 0.95,
            }}
          >
            Introduce tu email y te enviaremos instrucciones para restaurar tu contraseña
          </Typography>
        </Box>

        <Box
          component="form"
          action={handleSubmit}
          sx={{
            p: { xs: 3, sm: 4 },
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
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
                Email
              </Typography>
              <TextField
                error={formError}
                helperText={formError ? missingEmail : ""}
                id="email"
                type="email"
                name="email"
                placeholder="Escribe aquí tu email"
                autoFocus
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

            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{
                textTransform: "none",
                fontFamily: "Inter, sans-serif",
                fontSize: "1rem",
                fontWeight: 600,
                padding: "12px",
                borderRadius: "6px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                boxShadow: "0 4px 12px 0 rgba(102, 126, 234, 0.4)",
                transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  boxShadow: "0 6px 16px 0 rgba(102, 126, 234, 0.5)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              Enviar
            </Button>

            <Box sx={{ textAlign: "center", mt: 1 }}>
              <Link
                component={RouterLink}
                to="/login"
                underline="none"
                sx={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "0.875rem",
                  color: "#667eea",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  "&:hover": {
                    color: "#5568d3",
                  },
                }}
              >
                <ArrowBackIcon sx={{ fontSize: 18 }} />
                Volver al inicio
              </Link>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
