import { Alert, Avatar, Box, Button, Link, Paper, Typography } from "@mui/material";
import { useEffect, useState, type FC, type FormEvent } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router";
import LockResetIcon from "@mui/icons-material/LockReset";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { radii, shadows, alphas, fontSizes } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { PasswordInput } from "../../components/Forms/PasswordInput";
import { PasswordPolicyHint } from "../../components/Forms/PasswordPolicyHint";
import { useSessionActions } from "../../hooks/actions";
import { useEndSession } from "../../hooks/useEndSession";
import { checkPasswordPolicy, PASSWORD_RULE_MESSAGES } from "../../utils/passwordPolicy";
import { PASSWORD_UNCHANGED_MESSAGE, throttledMessage } from "../../errors/authErrors";
import { getFirstApiErrorMessage } from "../../errors/apiErrorCatalogue";

type Field = "newPassword" | "confirmPassword";
type FieldErrors = Partial<Record<Field, string>>;

const POLICY_HINT_ID = "new-password-policy";

export const INCOMPLETE_LINK_MESSAGE =
  "El enlace está incompleto. Ábrelo tal y como aparece en el email, o solicita uno nuevo.";
export const INVALID_LINK_MESSAGE = "El enlace no es válido o ha caducado. Solicita uno nuevo.";

/**
 * The token from the emailed link, `<web>/reset-password#<token>`: everything
 * after the `#`, exactly as it appears. A bare `#` is no token at all.
 */
function readTokenFromFragment(): string | null {
  return window.location.hash.slice(1) || null;
}

/**
 * Setting a new password with the token from an emailed link (#233).
 *
 * The token travels only in the URL fragment, so it never reaches a server
 * log. It is read once, during the first render, and kept in this component's
 * state -- never in storage, never in a log. An effect then removes the
 * fragment from the address bar and the current history entry. The effect
 * never writes the token: under StrictMode it runs twice, and the second run
 * finds no fragment and does nothing, so the token already read survives.
 *
 * Public, with or without a session: a refused password keeps the token, so
 * the member can correct it without a new link.
 */
export const ResetPassword: FC = () => {
  const [token] = useState(readTokenFromFragment);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const endSession = useEndSession();
  const { resetPassword } = useSessionActions().actions;

  useEffect(() => {
    // `href`, not `hash`: a bare trailing "#" leaves `hash` empty but is still
    // in the address bar.
    if (!window.location.href.includes("#")) return;
    navigate({ pathname, search }, { replace: true });
  }, [navigate, pathname, search]);

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!newPassword) {
      errors.newPassword = "Por favor, introduce tu nueva contraseña";
    } else {
      const rule = checkPasswordPolicy(newPassword);
      if (rule) errors.newPassword = PASSWORD_RULE_MESSAGES[rule];
    }
    if (!confirmPassword) {
      errors.confirmPassword = "Por favor, confirma tu nueva contraseña";
    } else if (newPassword && confirmPassword !== newPassword) {
      errors.confirmPassword = "Las contraseñas no coinciden";
    }
    return errors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setFormError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // Sent exactly as typed: never trimmed.
    const result = await resetPassword.run({ token, newPassword });
    if (result.ok) {
      // The backend has ended every session of this user and opened none, so
      // any session this browser still holds is gone too.
      endSession("passwordReset");
      navigate("/login", { replace: true });
      return;
    }

    const { failure } = result;
    switch (failure.kind) {
      case "resetTokenInvalid":
        setNewPassword("");
        setConfirmPassword("");
        setLinkInvalid(true);
        break;
      case "policyViolation":
        setFieldErrors({
          newPassword: failure.rule ? PASSWORD_RULE_MESSAGES[failure.rule] : "La contraseña no cumple los requisitos.",
        });
        break;
      case "passwordUnchanged":
        setFieldErrors({ newPassword: PASSWORD_UNCHANGED_MESSAGE });
        break;
      case "throttled":
        setFormError(throttledMessage(failure.retryAfterSeconds));
        break;
      default:
        setFormError(
          getFirstApiErrorMessage(
            failure.kind === "other" ? failure.error : undefined,
            "No se ha podido restablecer la contraseña. Por favor, inténtalo más tarde.",
          ),
        );
        break;
    }
  };

  const labelSx = { display: "block", fontSize: fontSizes.md, fontWeight: 600, color: "text.primary", mb: 1 } as const;

  const linkSx = {
    fontSize: fontSizes.md,
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    gap: 0.5,
    color: "primary.main",
    "&:hover": { color: "primary.dark" },
  } as const;

  const unusableLink = !token ? INCOMPLETE_LINK_MESSAGE : linkInvalid ? INVALID_LINK_MESSAGE : null;

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: { xs: 2, sm: 3 } }}>
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
          <Avatar sx={{ bgcolor: alphas.white.soft, width: 64, height: 64, margin: "0 auto 16px" }}>
            <LockResetIcon sx={{ fontSize: 36 }} />
          </Avatar>
          <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
            Restablecer contraseña
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.95 }}>
            Elige una nueva contraseña para tu cuenta
          </Typography>
        </Box>

        <Box sx={{ p: { xs: 3, sm: 4 } }}>
          {unusableLink ? (
            <Box sx={sxStyles.flexColumnGap3}>
              <Alert severity="error" sx={{ borderRadius: radii.default }}>
                {unusableLink}
              </Alert>
              <Box sx={{ textAlign: "center" }}>
                <Link component={RouterLink} to="/forgot-password" underline="none" sx={linkSx}>
                  Solicitar un nuevo enlace
                </Link>
              </Box>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit} noValidate sx={sxStyles.flexColumnGap3}>
              {formError && (
                <Alert severity="error" sx={{ borderRadius: radii.default }}>
                  {formError}
                </Alert>
              )}

              <Box>
                <Typography component="label" htmlFor="newPassword" sx={labelSx}>
                  Nueva contraseña
                </Typography>
                <PasswordInput
                  error={!!fieldErrors.newPassword}
                  helperText={fieldErrors.newPassword ?? ""}
                  id="newPassword"
                  name="newPassword"
                  placeholder="Introduce tu nueva contraseña"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                  required
                  fullWidth
                  variant="outlined"
                  slotProps={{
                    // Both: setting it replaces the reference MUI would add to the
                    // helper text, and the error must still be announced.
                    htmlInput: {
                      "aria-describedby": fieldErrors.newPassword
                        ? `newPassword-helper-text ${POLICY_HINT_ID}`
                        : POLICY_HINT_ID,
                    },
                  }}
                />
                <PasswordPolicyHint id={POLICY_HINT_ID} />
              </Box>

              <Box>
                <Typography component="label" htmlFor="confirmPassword" sx={labelSx}>
                  Repite la nueva contraseña
                </Typography>
                <PasswordInput
                  error={!!fieldErrors.confirmPassword}
                  helperText={fieldErrors.confirmPassword ?? ""}
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Repite tu nueva contraseña"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  fullWidth
                  variant="outlined"
                />
              </Box>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={resetPassword.isPending}
                sx={{
                  fontSize: fontSizes.lg,
                  fontWeight: 600,
                  boxShadow: shadows.medium,
                  "&:hover": { boxShadow: shadows.strong },
                }}
              >
                Restablecer contraseña
              </Button>
            </Box>
          )}

          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Link component={RouterLink} to="/login" underline="none" sx={linkSx}>
              <ArrowBackIcon sx={{ fontSize: 18 }} />
              Volver al inicio de sesión
            </Link>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
