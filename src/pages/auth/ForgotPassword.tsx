import { Alert, Box, Button, Link, TextField, Typography, Paper, Avatar } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useState, type FC, type FormEvent } from "react";
import { radii, shadows, alphas, fontSizes, interactiveTransition, motion } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import LockResetIcon from "@mui/icons-material/LockReset";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Link as RouterLink } from "react-router";
import { useSessionActions } from "../../hooks/actions";
import { throttledMessage } from "../../errors/authErrors";
import { getFirstApiErrorMessage } from "../../errors/apiErrorCatalogue";

/**
 * The same sentence whatever the account (#233): the backend answers 202 for
 * an unknown personal ID, a user without email and a sent link alike, and the
 * screen must not tell them apart either.
 */
export const RECOVERY_REQUESTED_MESSAGE =
  "Si tus datos son correctos y tienes un email registrado, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de correo no deseado.";

const MISSING_PERSONAL_ID_MESSAGE = "Por favor, introduce tu DNI/NIE/NIF";

/**
 * Requesting a password reset link by email (#233).
 *
 * Public, with or without a session. The field is controlled and the form
 * submits through `onSubmit`, so a throttled request keeps what was typed.
 */
export const ForgotPassword: FC = () => {
  const [personalId, setPersonalId] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);
  const { requestPasswordReset } = useSessionActions().actions;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    // The backend ignores spaces, dots and hyphens anyway.
    const id = personalId.trim();
    if (!id) {
      setFieldError(MISSING_PERSONAL_ID_MESSAGE);
      return;
    }
    setFieldError(null);

    const result = await requestPasswordReset.run({ personalId: id });
    if (result.ok) {
      setRequested(true);
      return;
    }

    const { failure } = result;
    setFormError(
      failure.kind === "throttled"
        ? throttledMessage(failure.retryAfterSeconds)
        : getFirstApiErrorMessage(
            failure.kind === "other" ? failure.error : undefined,
            "No se ha podido enviar la solicitud. Por favor, inténtalo más tarde.",
          ),
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
          boxShadow: shadows.auth, // prominent auth card — intentionally elevated
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
            <LockResetIcon sx={{ fontSize: 36 }} />
          </Avatar>
          <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
            ¿Olvidaste tu contraseña?
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.95 }}>
            Introduce tu DNI/NIE/NIF y te enviaremos un enlace por email para restablecer tu contraseña
          </Typography>
        </Box>

        <Box sx={{ p: { xs: 3, sm: 4 } }}>
          <Box sx={sxStyles.flexColumnGap3}>
            {requested ? (
              <Alert severity="success" sx={{ borderRadius: radii.default }}>
                {RECOVERY_REQUESTED_MESSAGE}
              </Alert>
            ) : (
              <Box component="form" onSubmit={handleSubmit} noValidate sx={sxStyles.flexColumnGap3}>
                {formError && (
                  <Alert severity="error" sx={{ borderRadius: radii.default }}>
                    {formError}
                  </Alert>
                )}

                <Box>
                  <Typography
                    component="label"
                    htmlFor="personalId"
                    sx={{
                      display: "block",
                      fontSize: fontSizes.md,
                      fontWeight: 600,
                      color: "text.primary",
                      mb: 1,
                    }}
                  >
                    DNI/NIE/NIF
                  </Typography>
                  <TextField
                    error={!!fieldError}
                    helperText={fieldError ?? ""}
                    id="personalId"
                    name="personalId"
                    placeholder="Escribe aquí tu DNI/NIE/NIF"
                    autoComplete="username"
                    value={personalId}
                    onChange={(e) => setPersonalId(e.target.value)}
                    autoFocus
                    required
                    fullWidth
                    variant="outlined"
                  />
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={requestPasswordReset.isPending}
                  sx={(theme) => ({
                    fontSize: fontSizes.xl,
                    fontWeight: 600,
                    padding: "12px", // 12px intentionally off-grid for button vertical rhythm
                    boxShadow: `0 4px 12px 0 ${alpha(theme.palette.primary.main, 0.4)}`,
                    transition: interactiveTransition("250ms", "cubic-bezier(0.4, 0, 0.2, 1)"),
                    "&:hover": {
                      boxShadow: `0 6px 16px 0 ${alpha(theme.palette.primary.main, 0.5)}`,
                      transform: `translateY(${motion.lift})`,
                    },
                  })}
                >
                  Enviar
                </Button>
              </Box>
            )}

            <Box sx={{ textAlign: "center", mt: 1 }}>
              <Link
                component={RouterLink}
                to="/login"
                underline="none"
                sx={(theme) => ({
                  fontSize: fontSizes.md,
                  color: theme.palette.primary.main,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  "&:hover": {
                    color: theme.palette.primary.dark,
                  },
                })}
              >
                <ArrowBackIcon sx={{ fontSize: 18 }} />
                Volver al inicio de sesión
              </Link>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
