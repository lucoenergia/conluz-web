import { useState, type FC } from "react";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Link,
  TextField,
  Typography,
  Paper,
  Avatar,
  Alert,
} from "@mui/material";
import WavingHandOutlinedIcon from "@mui/icons-material/WavingHandOutlined";
import { Link as RouterLink, useNavigate } from "react-router";
import { useLogin } from "../api/authentication/authentication";
import { PasswordInput } from "../components/Forms/PasswordInput";
import { useAuthDispatch } from "../context/auth.context";

export const Login: FC = () => {
  const [loginError, setLoginError] = useState(false);
  const [formErrors, setFormErrors] = useState<{ id: boolean; password: boolean }>({
    id: false,
    password: false,
  });

  const passwordErrorMessage = "Por favor, introduce tu contraseña";
  const idErrorMessage = "Por favor, introduce tu DNI/NIF";
  const login = useLogin();
  const dispatchAuth = useAuthDispatch();
  const navigate = useNavigate();

  const validateInput = (username?: string, password?: string): boolean => {
    const newErrors = {
      id: !username,
      password: !password,
    };

    setFormErrors(newErrors);

    return !newErrors.id && !newErrors.password;
  };

  const handleSubmit = async (data: FormData) => {
    const id = data.get("id") as string;
    const password = data.get("password") as string;
    const remember = data.get("remember") ? true : false;

    if (!validateInput(id, password)) return;
    try {
      const response = await login.mutateAsync({ data: { username: id.trim(), password: password.trim() } });
      if (response && response.token) {
        setLoginError(false);
        dispatchAuth({ token: response.token, remember });
        navigate("/");
      } else {
        setLoginError(true);
      }
    } catch (error) {
      setLoginError(true);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
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
            background: "#667eea",
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
            <WavingHandOutlinedIcon sx={{ fontSize: 36 }} />
          </Avatar>
          <Typography
            variant="h4"
            sx={{
              fontFamily: "Inter, sans-serif",
              fontWeight: 700,
              mb: 1,
            }}
          >
            Bienvenide a ConLuz
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontFamily: "Inter, sans-serif",
              opacity: 0.95,
            }}
          >
            Por favor, accede a tu cuenta introduciendo tu DNI/NIF y contraseña
          </Typography>
        </Box>

        <Box
          component="form"
          action={handleSubmit}
          sx={{
            p: { xs: 3, sm: 4 },
          }}
        >
          {loginError && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                fontFamily: "Inter, sans-serif",
                borderRadius: "6px",
              }}
            >
              DNI/NIF o contraseña incorrectos
            </Alert>
          )}

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
                DNI/NIF
              </Typography>
              <TextField
                error={formErrors.id}
                helperText={formErrors.id ? idErrorMessage : ""}
                id="id"
                type="text"
                name="id"
                placeholder="Escribe aquí tu DNI/NIF"
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
                Contraseña
              </Typography>
              <PasswordInput
                error={formErrors.password}
                helperText={formErrors.password ? passwordErrorMessage : ""}
                id="password"
                type="password"
                name="password"
                placeholder="Escribe aquí tu contraseña"
                autoComplete="password"
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

            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                justifyContent: "space-between",
                alignItems: { xs: "flex-start", sm: "center" },
                gap: 1,
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    name="remember"
                    sx={{
                      color: "#667eea",
                      "&.Mui-checked": {
                        color: "#667eea",
                      },
                    }}
                  />
                }
                label={
                  <Typography
                    sx={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "0.875rem",
                      color: "#475569",
                    }}
                  >
                    Recordarme
                  </Typography>
                }
              />
              <Link
                component={RouterLink}
                to="/forgot-password"
                underline="hover"
                sx={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "0.875rem",
                  color: "#667eea",
                  "&:hover": {
                    color: "#5568d3",
                  },
                }}
              >
                ¿Olvidaste tu contraseña?
              </Link>
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
                background: "#667eea",
                boxShadow: "0 4px 12px 0 rgba(102, 126, 234, 0.4)",
                transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  boxShadow: "0 6px 16px 0 rgba(102, 126, 234, 0.5)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              Entrar
            </Button>

            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Typography
                sx={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "0.875rem",
                  color: "#64748b",
                  mb: 1,
                }}
              >
                ¿No puedes acceder a la plataforma?
              </Typography>
              <Link
                component={RouterLink}
                to="/contact"
                underline="hover"
                sx={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "0.875rem",
                  color: "#667eea",
                  fontWeight: 600,
                  "&:hover": {
                    color: "#5568d3",
                  },
                }}
              >
                Contacta con nosotres
              </Link>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
