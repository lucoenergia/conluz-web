import { useState, type FC, type FormEvent } from "react";
import { alpha } from "@mui/material/styles";
import { radii, shadows, alphas, fontSizes, interactiveTransition, motion} from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
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
import { PasswordInput } from "../../components/Forms/PasswordInput";
import { useSessionActions } from "../../hooks/actions";
import { useAuthDispatch } from "../../context/auth.context";
import {
  PASSWORD_CHANGED_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
  takePasswordChanged,
  takeSessionExpired,
} from "../../utils/session";
import { throttledMessage } from "../../errors/authErrors";

export const Login: FC = () => {
  const [loginError, setLoginError] = useState<string | null>(null);
  /**
   * Whether the user is here because their session expired rather than because
   * they asked to leave. Read once, during the first render, and cleared by the
   * read: this page is also the destination of a plain logout and of a first
   * visit, and neither should claim an expiry.
   */
  const [sessionExpired] = useState(takeSessionExpired);
  /** Same, for a session ended by a successful password change (#196). */
  const [passwordChanged] = useState(takePasswordChanged);
  const [formErrors, setFormErrors] = useState<{ id: boolean; password: boolean }>({
    id: false,
    password: false,
  });
  // Controlled, so a refused login can keep the username and clear only the
  // password. The password is sent exactly as typed: never trimmed (#196).
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");

  const passwordErrorMessage = "Por favor, introduce tu contraseña";
  const idErrorMessage = "Por favor, introduce tu DNI/NIF";
  const { actions } = useSessionActions();
  const dispatchAuth = useAuthDispatch();
  const navigate = useNavigate();

  const validateInput = (username: string, password: string): boolean => {
    const newErrors = {
      id: !username,
      password: !password,
    };

    setFormErrors(newErrors);

    return !newErrors.id && !newErrors.password;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const remember = new FormData(event.currentTarget).get("remember") ? true : false;

    if (!validateInput(id, password)) return;

    // The username may be trimmed: the backend normalises the identity
    // document anyway. The password may not.
    const result = await actions.login.run({ username: id.trim(), password });
    if ("token" in result) {
      setLoginError(null);
      dispatchAuth({ token: result.token, remember });
      navigate("/");
      return;
    }

    setPassword("");
    setLoginError(
      result.failure.kind === "throttled"
        ? throttledMessage(result.failure.retryAfterSeconds)
        : "DNI/NIF o contraseña incorrectos",
    );
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
          borderRadius: radii.large,
          boxShadow: shadows.auth,
          overflow: "hidden",
        }}
      >
        <Box
          sx={(theme) => ({
            background: theme.palette.primary.main,
            color: "white",
            p: { xs: 3, sm: 4 },
            textAlign: "center",
          })}
        >
          <Avatar
            sx={{
              bgcolor: alphas.white.soft,
              width: 64,
              height: 64,
              margin: "0 auto 16px",
            }}
          >
            <WavingHandOutlinedIcon sx={{ fontSize: 36 }} />
          </Avatar>
          <Typography
            variant="h4"
            component="h1"
            sx={{ mb: 1 }}
          >
            Bienvenide a ConLuz
          </Typography>
          <Typography
            variant="body1"
            sx={{
              opacity: 0.95,
            }}
          >
            Por favor, accede a tu cuenta introduciendo tu DNI/NIF y contraseña
          </Typography>
        </Box>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            p: { xs: 3, sm: 4 },
          }}
        >
          {sessionExpired && !loginError && (
            <Alert
              severity="warning"
              sx={{
                mb: 3,
                borderRadius: radii.default,
              }}
            >
              {SESSION_EXPIRED_MESSAGE}
            </Alert>
          )}

          {passwordChanged && !loginError && (
            <Alert
              severity="success"
              sx={{
                mb: 3,
                borderRadius: radii.default,
              }}
            >
              {PASSWORD_CHANGED_MESSAGE}
            </Alert>
          )}

          {loginError && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: radii.default,
              }}
            >
              {loginError}
            </Alert>
          )}

          <Box sx={sxStyles.flexColumnGap3}>
            <Box>
              <Typography
                sx={{
                  fontSize: fontSizes.md,
                  fontWeight: 600,
                  color: "text.primary",
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
                autoComplete="username"
                value={id}
                onChange={(e) => setId(e.target.value)}
                autoFocus
                required
                fullWidth
                variant="outlined"

              />
            </Box>

            <Box>
              <Typography
                sx={{
                  fontSize: fontSizes.md,
                  fontWeight: 600,
                  color: "text.primary",
                  mb: 1,
                }}
              >
                Contraseña
              </Typography>
              <PasswordInput
                error={formErrors.password}
                helperText={formErrors.password ? passwordErrorMessage : ""}
                id="password"
                name="password"
                placeholder="Escribe aquí tu contraseña"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                variant="outlined"
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
                    sx={(theme) => ({
                      color: theme.palette.primary.main,
                      "&.Mui-checked": {
                        color: theme.palette.primary.main,
                      },
                    })}
                  />
                }
                label={
                  <Typography
                    sx={{
                      fontSize: fontSizes.md,
                      color: "secondary.main",
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
                sx={(theme) => ({
                  fontSize: fontSizes.md,
                  color: theme.palette.primary.main,
                  "&:hover": {
                    color: theme.palette.primary.dark,
                  },
                })}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </Box>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={(theme) => ({
                fontSize: fontSizes.xl,
                fontWeight: 600,
                padding: "12px", // 12px intentionally off-grid for button vertical rhythm
                background: theme.palette.primary.main,
                boxShadow: `0 4px 12px 0 ${alpha(theme.palette.primary.main, 0.4)}`,
                transition: interactiveTransition("250ms", "cubic-bezier(0.4, 0, 0.2, 1)"),
                "&:hover": {
                  boxShadow: `0 6px 16px 0 ${alpha(theme.palette.primary.main, 0.5)}`,
                  transform: `translateY(${motion.lift})`,
                },
              })}
            >
              Entrar
            </Button>

            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Typography
                sx={{
                  fontSize: fontSizes.md,
                  color: "text.secondary",
                  mb: 1,
                }}
              >
                ¿No puedes acceder a la plataforma?
              </Typography>
              <Link
                component={RouterLink}
                to="/contact"
                underline="hover"
                sx={(theme) => ({
                  fontSize: fontSizes.md,
                  color: theme.palette.primary.main,
                  fontWeight: 600,
                  "&:hover": {
                    color: theme.palette.primary.dark,
                  },
                })}
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
