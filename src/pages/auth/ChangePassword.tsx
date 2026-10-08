import { useState, type FC, type FormEvent } from "react";
import { Alert, Box, Button, Typography, Paper, Avatar } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { radii, shadows, alphas, fontSizes, colors } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import KeyIcon from "@mui/icons-material/Key";
import { useNavigate } from "react-router";
import { BreadCrumb } from "../../components/Breadcrumb";
import { PasswordInput } from "../../components/Forms/PasswordInput";
import { PasswordPolicyHint } from "../../components/Forms/PasswordPolicyHint";
import { useProfileActions } from "../../hooks/actions";
import { useEndSession } from "../../hooks/useEndSession";
import { useLoggedUser } from "../../context/logged-user.context";
import { checkPasswordPolicy, PASSWORD_RULE_MESSAGES } from "../../utils/passwordPolicy";
import { PASSWORD_UNCHANGED_MESSAGE, throttledMessage } from "../../errors/authErrors";
import { getFirstApiErrorMessage } from "../../errors/apiErrorCatalogue";

type Field = "currentPassword" | "newPassword" | "confirmPassword";
type FieldErrors = Partial<Record<Field, string>>;

const POLICY_HINT_ID = "new-password-policy";

const FORCED_PASSWORD_CHANGE_MESSAGE = "Por seguridad, debes cambiar tu contraseña antes de continuar.";

/**
 * Changing the caller's own password (#196).
 *
 * The fields are controlled and the form submits through `onSubmit`: a React
 * form `action` resets uncontrolled fields after every submit, which would
 * wipe what the user typed on a mere wrong current password. Values are stored
 * and sent exactly as typed -- never trimmed.
 *
 * Every outcome but success keeps the session: a 400 is a mistake to correct
 * and a 429 a wait, and the backend leaves the token valid for both.
 */
export const ChangePasswordPage: FC = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();
  const endSession = useEndSession();
  const { changePassword } = useProfileActions().actions;
  // While the flag is set the layout sends every other route back here, so
  // offering a way out (Cancel, the breadcrumb) would only bounce.
  const isForced = useLoggedUser()?.mustChangePassword === true;

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!currentPassword) errors.currentPassword = "Por favor, introduce tu contraseña actual";
    if (!newPassword) {
      errors.newPassword = "Por favor, introduce tu nueva contraseña";
    } else {
      const rule = checkPasswordPolicy(newPassword);
      if (rule) {
        errors.newPassword = PASSWORD_RULE_MESSAGES[rule];
      } else if (newPassword === currentPassword) {
        // Refused on every change, voluntary or forced (#196), as the backend
        // does (lucoenergia/conluz#342). Compared exactly: no trimming, case
        // folding or normalisation, so the two sides agree.
        errors.newPassword = PASSWORD_UNCHANGED_MESSAGE;
      }
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
    setFormError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const result = await changePassword.run({ currentPassword, newPassword });
    if (result.ok) {
      // The backend has already revoked the token and cleared its cookie;
      // this ends the session on the client and leaves a note for the login
      // page.
      endSession("passwordChanged");
      navigate("/login", { replace: true });
      return;
    }

    const { failure } = result;
    switch (failure.kind) {
      case "currentPasswordIncorrect":
        setFieldErrors({ currentPassword: "La contraseña actual no es correcta." });
        break;
      case "policyViolation":
        setFieldErrors({
          newPassword: failure.rule ? PASSWORD_RULE_MESSAGES[failure.rule] : "La contraseña no cumple los requisitos.",
        });
        break;
      case "passwordUnchanged":
        // The backend's own refusal of the same password (#211), shown where
        // the check before sending shows it.
        setFieldErrors({ newPassword: PASSWORD_UNCHANGED_MESSAGE });
        break;
      case "throttled":
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setFormError(throttledMessage(failure.retryAfterSeconds));
        break;
      case "unauthorized":
        // The token was already invalid: this is an expiry, not a password
        // problem. ProtectedRoute redirects once the token is gone.
        endSession("expired");
        break;
      case "other":
        setFormError(
          getFirstApiErrorMessage(
            failure.error,
            "No se ha podido cambiar la contraseña. Por favor, inténtalo más tarde.",
          ),
        );
        break;
    }
  };

  const labelSx = { display: "block", fontSize: fontSizes.md, fontWeight: 600, color: "text.primary", mb: 1 } as const;

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
      {!isForced && (
        <Box sx={sxStyles.pageContainerFull}>
          <BreadCrumb
            steps={[
              { label: "Inicio", href: "/" },
              { label: "Mi perfil", href: "/profile" },
              { label: "Cambiar contraseña", href: "#" },
            ]}
          />
        </Box>
      )}

      <Paper
        elevation={0}
        sx={(theme) => ({
          p: { xs: 2, sm: 3 },
          borderRadius: { xs: 0, sm: radii.large },
          background: theme.palette.primary.main,
          color: "white",
          mx: { xs: 0, sm: 0 },
          width: { xs: "100%", sm: "auto" },
          // Padding inside the phone width; at sm the width is auto (#211).
          boxSizing: "border-box",
        })}
      >
        <Box sx={sxStyles.flexRowCenter}>
          <Avatar sx={{ bgcolor: alphas.white.soft, width: 56, height: 56 }}>
            <KeyIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" component="h1">Cambiar contraseña</Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>Actualiza tu contraseña de acceso</Typography>
          </Box>
        </Box>
      </Paper>

      <Box sx={sxStyles.pageContainerFull}>
        <Paper
          elevation={0}
          // border-box: the panel's padding sits inside its 100% width.
          // Without it the panel overflowed its container by the padding,
          // and the page's overflow:hidden cut the fields and the submit
          // button off at mobile width (#196, AC12).
          sx={[sxStyles.softPanel, { width: "100%", maxWidth: 600, margin: "0 auto", boxSizing: "border-box" }]}
        >
          <Box component="form" onSubmit={handleSubmit} noValidate sx={sxStyles.flexColumnGap3}>
            {isForced && (
              <Alert severity="info" sx={{ borderRadius: radii.default }}>
                {FORCED_PASSWORD_CHANGE_MESSAGE}
              </Alert>
            )}

            {formError && (
              <Alert severity="error" sx={{ borderRadius: radii.default }}>
                {formError}
              </Alert>
            )}

            <Box>
              <Typography component="label" htmlFor="currentPassword" sx={labelSx}>
                Contraseña actual
              </Typography>
              <PasswordInput
                error={!!fieldErrors.currentPassword}
                helperText={fieldErrors.currentPassword ?? ""}
                id="currentPassword"
                name="currentPassword"
                placeholder="Introduce tu contraseña actual"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                fullWidth
                variant="outlined"
              />
            </Box>

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

            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 2 }}>
              {!isForced && (
                <Button
                  variant="outlined"
                  onClick={() => navigate(-1)}
                  sx={(theme) => ({
                    fontSize: fontSizes.lg,
                    fontWeight: 500,
                    borderColor: theme.palette.primary.main,
                    color: theme.palette.primary.main,
                    px: 3,
                    "&:hover": {
                      borderColor: theme.palette.primary.dark,
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                    },
                  })}
                >
                  Cancelar
                </Button>
              )}
              <Button
                type="submit"
                variant="contained"
                disabled={changePassword.isPending}
                sx={{
                  fontSize: fontSizes.lg,
                  fontWeight: 600,
                  boxShadow: shadows.medium,
                  px: 3,
                  "&:hover": { boxShadow: shadows.strong },
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
