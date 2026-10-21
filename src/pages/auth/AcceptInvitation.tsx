import { Alert, Avatar, Box, Button, CircularProgress, Link, Paper, TextField, Typography } from "@mui/material";
import { useEffect, useRef, useState, type FC, type FormEvent, type ReactNode } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router";
import GroupAddOutlinedIcon from "@mui/icons-material/GroupAddOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import type { InvitationInspectionResponse } from "../../api/models";
import { radii, shadows, alphas, fontSizes } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { PasswordInput } from "../../components/Forms/PasswordInput";
import { PasswordPolicyHint } from "../../components/Forms/PasswordPolicyHint";
import { useInvitationActions, useSessionActions } from "../../hooks/actions";
import { useEndSession } from "../../hooks/useEndSession";
import { useBoundedRevoke } from "../../hooks/useBoundedRevoke";
import { useGetCurrentUser } from "../../api/users/users";
import { useAuth, useAuthDispatch } from "../../context/auth.context";
import { useLoggedUser } from "../../context/logged-user.context";
import { checkPasswordPolicy, PASSWORD_RULE_MESSAGES } from "../../utils/passwordPolicy";
import { throttledMessage } from "../../errors/authErrors";
import { markInvitationAccepted, markPlatformInvitationAccepted } from "../../utils/session";
import { isWellFormedConfirmationCode } from "../../utils/confirmationCode";

type Field = "newPassword" | "confirmPassword";
type FieldErrors = Partial<Record<Field, string>>;

/**
 * Where the screen is. `login` is the path for an account that already has a
 * password: a button when signed in, a login form when not.
 */
type Mode =
  | "inspecting"
  | "inspectFailed"
  | "invalid"
  | "setPassword"
  | "login"
  | "passwordChangeRequired"
  | "codeExhausted";

const POLICY_HINT_ID = "invitation-new-password-policy";

export const INCOMPLETE_LINK_MESSAGE = "El enlace está incompleto. Ábrelo tal y como aparece en el email.";
export const INVALID_LINK_MESSAGE =
  "Este enlace no es válido o ha caducado. Pide a tu comunidad que te lo vuelva a enviar.";
export const PLATFORM_INVALID_LINK_MESSAGE =
  "Este enlace no es válido o ha caducado. Pide a quien te invitó que te lo vuelva a enviar.";
export const CODE_REQUIRED_MESSAGE = "Escribe el código de confirmación";
export const CODE_MALFORMED_MESSAGE = "El código tiene 8 letras o números";
export const CODE_INVALID_MESSAGE = "El código no es correcto. Revisa que sea el que te dio quien te invitó.";
export const CODE_EXHAUSTED_MESSAGE =
  "Esta invitación se ha cancelado tras demasiados códigos incorrectos. Pide a quien te invitó que te envíe una nueva.";
export const OTHER_ACCOUNT_MESSAGE =
  "Si la invitación es para otra cuenta, cierra sesión e inicia sesión con ella aquí.";
export const PASSWORD_CHANGE_REQUIRED_MESSAGE =
  "Antes de aceptar la invitación tienes que cambiar tu contraseña. Después, vuelve a abrir el enlace del email: sigue siendo válido.";
export const LOGIN_FAILED_MESSAGE = "DNI/NIF o contraseña incorrectos";
const SESSION_ENDED_MESSAGE = "Tu sesión ha caducado. Vuelve a iniciar sesión.";
const INSPECT_FAILED_MESSAGE = "No se ha podido comprobar la invitación. Inténtalo de nuevo más tarde.";
const ACCEPT_FAILED_MESSAGE = "No se ha podido aceptar la invitación. Inténtalo de nuevo más tarde.";
export const LOGIN_INCOMPLETE_MESSAGE = "No se ha podido completar el inicio de sesión. Inténtalo de nuevo.";

function statusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null | undefined)?.response?.status;
}

/**
 * The token from the emailed link, `<web>/accept-invitation#<token>`: everything
 * after the `#`, exactly as it appears. A bare `#` is no token at all.
 */
function readTokenFromFragment(): string | null {
  return window.location.hash.slice(1) || null;
}

/**
 * The confirmation code a platform-admin invitation needs (#288), as each
 * acceptance path uses it: the field to render, the check before sending, and
 * the part of the body it adds. Absent for a community invitation, whose
 * paths and bodies stay exactly as they were.
 */
interface ConfirmationCodeControl {
  field: ReactNode;
  /** False, with the reason on the field, when the typed value cannot be a code. */
  check: () => boolean;
  body: () => { confirmationCode: string };
}

/**
 * Accepting an invitation from an emailed link (#274).
 *
 * The token follows the reset link's rules (#233): it travels only in the URL
 * fragment, is read once during the first render and kept in this component's
 * state -- never in storage, never in a log -- and an effect then removes the
 * fragment from the address bar. The effect never touches the token, so under
 * StrictMode its second run finds no fragment and does nothing.
 *
 * Public, with or without a session. An account that already has a password
 * accepts signed in, and somebody who is not signed in logs in here rather
 * than on the login page: that page sends a signed-in caller to "/", and the
 * token, which lives only in this component, would be lost. Nothing above this
 * page reacts to a new session -- the layout serves signed-in callers, and the
 * providers always render their children -- so the page stays mounted through
 * the login and accepts with the token it still holds.
 *
 * A platform-admin invitation (#288) also needs the confirmation code that
 * whoever invited gave the person, on both paths. Like the token it lives only
 * in this component's state -- the field's value -- and in the body of the
 * request that sends it, so it survives a login on this page and a wrong
 * code, and is gone when the page closes.
 */
export const AcceptInvitation: FC = () => {
  const [token] = useState(readTokenFromFragment);
  const [mode, setMode] = useState<Mode>("inspecting");
  const [invitation, setInvitation] = useState<InvitationInspectionResponse | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [offerLogout, setOfferLogout] = useState(false);
  const [acceptAfterLogin, setAcceptAfterLogin] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const authToken = useAuth();
  const loggedUser = useLoggedUser();
  const dispatchAuth = useAuthDispatch();
  const endSession = useEndSession();
  const { inspect, accept, acceptAsCurrentUser } = useInvitationActions().actions;
  const { login } = useSessionActions().actions;
  const revoke = useBoundedRevoke();
  const [leaving, setLeaving] = useState(false);
  // The current user that `LoggedUserProvider` serves, read here for its
  // failure only: the provider ends the session on a 401, and shares nothing
  // else. Disabled, so it never fetches on its own; `refetch` is the retry.
  const currentUser = useGetCurrentUser({ query: { enabled: false, throwOnError: false } });

  useEffect(() => {
    // `href`, not `hash`: a bare trailing "#" leaves `hash` empty but is still
    // in the address bar.
    if (!window.location.href.includes("#")) return;
    navigate({ pathname, search }, { replace: true });
  }, [navigate, pathname, search]);

  const runInspection = async (linkToken: string) => {
    setMode("inspecting");
    setNotice(null);
    const result = await inspect.run({ token: linkToken });
    if (result.ok) {
      setInvitation(result.invitation);
      setMode(result.invitation.loginRequired ? "login" : "setPassword");
      return;
    }
    const { failure } = result;
    if (failure.kind === "tokenInvalid") {
      setMode("invalid");
      return;
    }
    setNotice(failure.kind === "throttled" ? throttledMessage(failure.retryAfterSeconds) : INSPECT_FAILED_MESSAGE);
    setMode("inspectFailed");
  };

  const leaveSession = async () => {
    // Revoke first, as every logout does (#213), and end the session here
    // whatever the answer, or once the revoke has had as long as a logout
    // gives it: the browser must not keep the session either way.
    setLeaving(true);
    try {
      await revoke();
      endSession("logout");
    } finally {
      setLeaving(false);
    }
  };

  const isPlatform = invitation?.kind === "PLATFORM";
  // A missing field, from a backend that predates it, asks for no code.
  const codeRequired = invitation?.confirmationCodeRequired === true;

  const checkCode = (): boolean => {
    const typed = confirmationCode.trim();
    const error = typed === "" ? CODE_REQUIRED_MESSAGE : isWellFormedConfirmationCode(typed) ? null : CODE_MALFORMED_MESSAGE;
    setCodeError(error);
    return error === null;
  };

  const code: ConfirmationCodeControl | undefined = codeRequired
    ? {
        field: (
          <ConfirmationCodeField
            value={confirmationCode}
            autoFocus={mode === "setPassword"}
            error={codeError}
            onChange={(value) => {
              setConfirmationCode(value);
              setCodeError(null);
            }}
          />
        ),
        check: checkCode,
        // As typed, trimmed: the backend ignores case, spaces and hyphens.
        body: () => ({ confirmationCode: confirmationCode.trim() }),
      }
    : undefined;

  const markAccepted = () => {
    if (isPlatform) markPlatformInvitationAccepted();
    else if (invitation?.community) markInvitationAccepted(invitation.community.name);
  };

  const handleCodeRefused = (kind: "codeInvalid" | "codeExhausted") => {
    if (kind === "codeInvalid") {
      setCodeError(CODE_INVALID_MESSAGE);
    } else {
      setMode("codeExhausted");
    }
  };

  const acceptSignedIn = async (linkToken: string) => {
    setNotice(null);
    const result = await acceptAsCurrentUser.run({ token: linkToken, ...code?.body() });
    if (result.ok) {
      markAccepted();
      navigate("/", { replace: true });
      return;
    }
    const { failure } = result;
    switch (failure.kind) {
      case "codeInvalid":
      case "codeExhausted":
        handleCodeRefused(failure.kind);
        break;
      case "tokenInvalid":
        // The backend answers an invitation for another account with the same
        // code as an expired one, so the screen cannot tell them apart either:
        // it says what both mean, and offers the way out of the first.
        setOfferLogout(true);
        setMode("invalid");
        break;
      case "passwordChangeRequired":
        setMode("passwordChangeRequired");
        break;
      case "throttled":
        setNotice(throttledMessage(failure.retryAfterSeconds));
        break;
      case "unauthorized":
        endSession("logout");
        setNotice(SESSION_ENDED_MESSAGE);
        break;
      default:
        setNotice(ACCEPT_FAILED_MESSAGE);
        break;
    }
  };

  // The effects below start work with the handlers of the latest render. This
  // one runs first, since effects run in the order they are declared.
  const handlersRef = useRef({ runInspection, acceptSignedIn });
  useEffect(() => {
    handlersRef.current = { runInspection, acceptSignedIn };
  });

  // Once per mount. StrictMode runs this effect twice on the same component,
  // and the ref survives between the runs, so only one inspection is sent.
  const inspectedRef = useRef(false);
  useEffect(() => {
    if (!token || inspectedRef.current) return;
    inspectedRef.current = true;
    void handlersRef.current.runInspection(token);
  }, [token]);

  // After a login on this page: accept once the session is live. Waiting for
  // the current user is what makes sure the request carries the new token --
  // the auth header is attached by an effect of the auth provider, which runs
  // after this page's effects in the commit that stores the token.
  const acceptingRef = useRef(false);
  useEffect(() => {
    if (!token || !acceptAfterLogin || !loggedUser || acceptingRef.current) return;
    acceptingRef.current = true;
    setAcceptAfterLogin(false);
    void handlersRef.current.acceptSignedIn(token).finally(() => {
      acceptingRef.current = false;
    });
  }, [token, acceptAfterLogin, loggedUser]);

  const handleLoggedIn = (sessionToken: string) => {
    setNotice(null);
    dispatchAuth({ token: sessionToken, remember: false });
    setAcceptAfterLogin(true);
  };

  const handlePasswordSet = async () => {
    markAccepted();
    // A session in this browser belongs to somebody else: the invited account
    // had no password until now. The login page would send it to "/" and
    // never show the notice, so it ends here, revoked like any logout.
    if (authToken) await leaveSession();
    navigate("/login", { replace: true });
  };

  const handleLoginRequired = () => {
    setNotice(null);
    setMode("login");
  };

  const handleLogoutForOtherAccount = async () => {
    await leaveSession();
    setOfferLogout(false);
    setMode("login");
  };

  // After a login here, the current user failed for a reason other than an
  // expired session (the provider ends that one). The acceptance waits for it,
  // so without a retry the screen would wait for good; the token is still in
  // state, and a successful retry lets the acceptance go out.
  const loginIncomplete =
    acceptAfterLogin && !loggedUser && currentUser.isError && statusOf(currentUser.error) !== 401;

  const communityName = invitation?.community?.name;
  // A platform invitation names no community (#288).
  const heading = isPlatform
    ? "Únete como administrador de la plataforma"
    : communityName
      ? `Únete a ${communityName}`
      : "Aceptar invitación";
  const ofTheInvitation = isPlatform
    ? "Acepta la invitación para administrar la plataforma"
    : "Acepta la invitación de tu comunidad";
  const subtitle = !token
    ? ofTheInvitation
    : mode === "setPassword"
      ? "Elige una contraseña para tu cuenta"
      : mode === "login"
        ? authToken
          ? "Acepta la invitación con tu cuenta"
          : "Inicia sesión para aceptar la invitación"
        : ofTheInvitation;

  let body: ReactNode;
  if (!token) {
    body = <Alert severity="error" sx={{ borderRadius: radii.default }}>{INCOMPLETE_LINK_MESSAGE}</Alert>;
  } else if (mode === "inspecting") {
    body = (
      <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
        <CircularProgress aria-label="Comprobando la invitación" />
      </Box>
    );
  } else if (mode === "inspectFailed") {
    body = (
      <Box sx={sxStyles.flexColumnGap3}>
        <Alert severity="error" sx={{ borderRadius: radii.default }}>{notice}</Alert>
        <Button variant="outlined" onClick={() => void runInspection(token)}>
          Reintentar
        </Button>
      </Box>
    );
  } else if (mode === "invalid") {
    body = (
      <Box sx={sxStyles.flexColumnGap3}>
        <Alert severity="error" sx={{ borderRadius: radii.default }}>
          {isPlatform ? PLATFORM_INVALID_LINK_MESSAGE : INVALID_LINK_MESSAGE}
        </Alert>
        {offerLogout && authToken && (
          <>
            <Typography sx={{ fontSize: fontSizes.md, color: "text.secondary" }}>{OTHER_ACCOUNT_MESSAGE}</Typography>
            <Button variant="outlined" disabled={leaving} onClick={() => void handleLogoutForOtherAccount()}>
              Cerrar sesión
            </Button>
          </>
        )}
      </Box>
    );
  } else if (mode === "passwordChangeRequired") {
    body = (
      <Box sx={sxStyles.flexColumnGap3}>
        <Alert severity="warning" sx={{ borderRadius: radii.default }}>{PASSWORD_CHANGE_REQUIRED_MESSAGE}</Alert>
        <Button component={RouterLink} to="/change-password" variant="contained">
          Cambiar contraseña
        </Button>
      </Box>
    );
  } else if (mode === "codeExhausted") {
    // Final: the link is revoked, so nothing here can be tried again.
    body = <Alert severity="error" sx={{ borderRadius: radii.default }}>{CODE_EXHAUSTED_MESSAGE}</Alert>;
  } else if (mode === "setPassword") {
    body = (
      <SetPasswordForm
        token={token}
        accept={accept}
        code={code}
        onAccepted={handlePasswordSet}
        onInvalid={() => setMode("invalid")}
        onLoginRequired={handleLoginRequired}
        onCodeRefused={handleCodeRefused}
      />
    );
  } else if (authToken && loginIncomplete) {
    body = (
      <Box sx={sxStyles.flexColumnGap3}>
        <Alert severity="error" sx={{ borderRadius: radii.default }}>{LOGIN_INCOMPLETE_MESSAGE}</Alert>
        <Button variant="outlined" disabled={currentUser.isFetching} onClick={() => void currentUser.refetch()}>
          Reintentar
        </Button>
      </Box>
    );
  } else if (authToken) {
    body = (
      <Box sx={sxStyles.flexColumnGap3}>
        {notice && <Alert severity="error" sx={{ borderRadius: radii.default }}>{notice}</Alert>}
        {loggedUser && (
          <Typography sx={{ fontSize: fontSizes.md, color: "text.secondary" }}>
            Has iniciado sesión como <strong>{loggedUser.fullName}</strong>.
          </Typography>
        )}
        {code?.field}
        <Button
          variant="contained"
          fullWidth
          disabled={!loggedUser || acceptAfterLogin || acceptAsCurrentUser.isPending}
          onClick={() => {
            if (code && !code.check()) return;
            void acceptSignedIn(token);
          }}
          sx={submitSx}
        >
          Aceptar invitación
        </Button>
      </Box>
    );
  } else {
    body = <InvitationLoginForm login={login} code={code} notice={notice} onLoggedIn={handleLoggedIn} />;
  }

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
            <GroupAddOutlinedIcon sx={{ fontSize: 36 }} />
          </Avatar>
          <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
            {heading}
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.95 }}>
            {subtitle}
          </Typography>
        </Box>

        <Box sx={{ p: { xs: 3, sm: 4 } }}>
          {body}

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

const submitSx = {
  fontSize: fontSizes.lg,
  fontWeight: 600,
  boxShadow: shadows.medium,
  "&:hover": { boxShadow: shadows.strong },
} as const;

type InvitationActionsBundle = ReturnType<typeof useInvitationActions>["actions"];

interface ConfirmationCodeFieldProps {
  value: string;
  error: string | null;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

/**
 * The confirmation code of a platform-admin invitation (#288). Never
 * autocompleted, and accepted in any case, with spaces and hyphens.
 */
const ConfirmationCodeField: FC<ConfirmationCodeFieldProps> = ({ value, error, onChange, autoFocus }) => (
  <Box>
    <Typography component="label" htmlFor="confirmationCode" sx={labelSx}>
      Código de confirmación
    </Typography>
    <TextField
      error={!!error}
      helperText={error ?? "Te lo ha dado quien te invitó. No llega por email."}
      id="confirmationCode"
      name="confirmationCode"
      placeholder="ABCD-EFGH"
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoFocus={autoFocus}
      required
      fullWidth
      variant="outlined"
      slotProps={{ htmlInput: { autoCapitalize: "characters", autoCorrect: "off", spellCheck: false } }}
    />
  </Box>
);

interface SetPasswordFormProps {
  token: string;
  accept: InvitationActionsBundle["accept"];
  /** The code a platform-admin invitation needs; absent for a community one. */
  code: ConfirmationCodeControl | undefined;
  onAccepted: () => Promise<void>;
  onInvalid: () => void;
  onLoginRequired: () => void;
  onCodeRefused: (kind: "codeInvalid" | "codeExhausted") => void;
}

/** Path for an account with no password yet: choosing the first one accepts the invitation. */
const SetPasswordForm: FC<SetPasswordFormProps> = ({
  token,
  accept,
  code,
  onAccepted,
  onInvalid,
  onLoginRequired,
  onCodeRefused,
}) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

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
    setFormError(null);

    const errors = validate();
    setFieldErrors(errors);
    const codeOk = code ? code.check() : true;
    if (Object.keys(errors).length > 0 || !codeOk) return;

    // Sent exactly as typed: never trimmed.
    const result = await accept.run({ token, newPassword, ...code?.body() });
    if (result.ok) {
      await onAccepted();
      return;
    }

    const { failure } = result;
    switch (failure.kind) {
      case "tokenInvalid":
        onInvalid();
        break;
      case "loginRequired":
        // The account has a password after all: accept it signed in.
        onLoginRequired();
        break;
      case "codeInvalid":
      case "codeExhausted":
        onCodeRefused(failure.kind);
        break;
      case "policyViolation":
        setFieldErrors({
          newPassword: failure.rule ? PASSWORD_RULE_MESSAGES[failure.rule] : "La contraseña no cumple los requisitos.",
        });
        break;
      case "throttled":
        setFormError(throttledMessage(failure.retryAfterSeconds));
        break;
      default:
        setFormError(ACCEPT_FAILED_MESSAGE);
        break;
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={sxStyles.flexColumnGap3}>
      {formError && (
        <Alert severity="error" sx={{ borderRadius: radii.default }}>
          {formError}
        </Alert>
      )}

      {code?.field}

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
          // The code comes first when there is one, and takes the focus.
          autoFocus={!code}
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

      <Button type="submit" variant="contained" fullWidth disabled={accept.isPending} sx={submitSx}>
        Aceptar invitación
      </Button>
    </Box>
  );
};

interface InvitationLoginFormProps {
  login: ReturnType<typeof useSessionActions>["actions"]["login"];
  /** The code a platform-admin invitation needs, checked before logging in; absent for a community one. */
  code: ConfirmationCodeControl | undefined;
  notice: string | null;
  onLoggedIn: (sessionToken: string) => void;
}

/**
 * Logging in without leaving the screen. Unlike the login page it does not
 * navigate: the invitation is accepted next, with the token this screen holds.
 * There is no "Recordarme": the session is kept for this tab, as a login that
 * does not ask to be remembered is.
 */
const InvitationLoginForm: FC<InvitationLoginFormProps> = ({ login, code, notice, onLoggedIn }) => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [formErrors, setFormErrors] = useState({ id: false, password: false });
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = { id: !id, password: !password };
    setFormErrors(errors);
    // Checked before logging in: no session is opened for a code that cannot be one.
    const codeOk = code ? code.check() : true;
    if (errors.id || errors.password || !codeOk) return;

    // The username may be trimmed: the backend normalises the identity
    // document anyway. The password may not.
    const result = await login.run({ username: id.trim(), password });
    setPassword("");
    if ("token" in result) {
      setLoginError(null);
      onLoggedIn(result.token);
      return;
    }
    setLoginError(
      result.failure.kind === "throttled" ? throttledMessage(result.failure.retryAfterSeconds) : LOGIN_FAILED_MESSAGE,
    );
  };

  const shown = loginError ?? notice;

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={sxStyles.flexColumnGap3}>
      {shown && (
        <Alert severity="error" sx={{ borderRadius: radii.default }}>
          {shown}
        </Alert>
      )}

      <Box>
        <Typography component="label" htmlFor="invitation-id" sx={labelSx}>
          DNI/NIF
        </Typography>
        <TextField
          error={formErrors.id}
          helperText={formErrors.id ? "Por favor, introduce tu DNI/NIF" : ""}
          id="invitation-id"
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
        <Typography component="label" htmlFor="invitation-password" sx={labelSx}>
          Contraseña
        </Typography>
        <PasswordInput
          error={formErrors.password}
          helperText={formErrors.password ? "Por favor, introduce tu contraseña" : ""}
          id="invitation-password"
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

      {code?.field}

      <Button type="submit" variant="contained" fullWidth disabled={login.isPending} sx={submitSx}>
        Entrar y aceptar
      </Button>
    </Box>
  );
};
