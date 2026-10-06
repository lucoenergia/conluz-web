import { useState, type FC } from "react";
import { sxStyles } from "../../theme/sx";
import {
  Box,
  Button,
  CircularProgress,
  TextField,
} from "@mui/material";
import { colors, fontSizes } from "../../theme/tokens";
import { PasswordInput } from "../Forms/PasswordInput";
import { PasswordPolicyHint } from "../Forms/PasswordPolicyHint";
import { checkPasswordPolicy, PASSWORD_RULE_MESSAGES } from "../../utils/passwordPolicy";

const POLICY_HINT_ID = "user-password-policy";
const PASSWORD_FIELD_ID = "user-password";

export interface UserFormValues {
  fullName: string;
  personalId: string;
  email: string;
  address: string;
  phoneNumber: string;
  number?: number;
  password?: string;
}

interface UserFormProps {
  mode: "create" | "edit";
  initialValues?: Partial<UserFormValues>;
  handleSubmit: (values: UserFormValues) => void;
  isPending: boolean;
  submitLabel: string;
  disabled?: boolean;
}


export const UserForm: FC<UserFormProps> = ({
  mode,
  initialValues: {
    fullName: initialFullName = "",
    personalId: initialPersonalId = "",
    email: initialEmail = "",
    address: initialAddress = "",
    phoneNumber: initialPhoneNumber = "",
  } = {},
  handleSubmit,
  isPending,
  submitLabel,
  disabled = false,
}) => {
  const [fullName, setFullName] = useState(initialFullName);
  const [personalId, setPersonalId] = useState(initialPersonalId);
  const [email, setEmail] = useState(initialEmail);
  const [address, setAddress] = useState(initialAddress);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [number, setNumber] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  // The policy is checked here as on the change-password page (#196), so an
  // admin learns which rule a password breaks before anything is sent. The
  // server stays the authority.
  const [passwordPolicyError, setPasswordPolicyError] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "create") {
      const rule = checkPasswordPolicy(password);
      if (rule) {
        setPasswordPolicyError(PASSWORD_RULE_MESSAGES[rule]);
        return;
      }
      if (password !== passwordConfirm) {
        setPasswordError("Las contraseñas no coinciden");
        return;
      }
    }

    handleSubmit({
      fullName,
      personalId,
      email,
      address,
      phoneNumber,
      ...(mode === "create" && {
        number: Number(number),
        password,
      }),
    });
  };

  return (
    <Box component="form" onSubmit={onSubmit} noValidate>
      <Box sx={sxStyles.flexColumnGap3}>
        <TextField
          label="Nombre completo"
          variant="outlined"
          fullWidth
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <TextField
          label="DNI/NIF"
          variant="outlined"
          fullWidth
          required
          value={personalId}
          onChange={(e) => setPersonalId(e.target.value)}
        />

        {mode === "create" && (
          <TextField
            label="Número de socio"
            variant="outlined"
            fullWidth
            required
            type="number"
            inputProps={{ min: 0, step: 1 }}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            />
        )}

        <TextField
          label="Email"
          variant="outlined"
          fullWidth
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <TextField
          label="Dirección"
          variant="outlined"
          fullWidth
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <TextField
          label="Número de teléfono"
          variant="outlined"
          fullWidth
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />

        {mode === "create" && (
          <>
            {/* Sent exactly as typed: never trimmed or transformed (#196). */}
            <Box>
              <PasswordInput
                id={PASSWORD_FIELD_ID}
                label="Contraseña"
                variant="outlined"
                fullWidth
                required
                autoComplete="new-password"
                value={password}
                error={!!passwordPolicyError}
                helperText={passwordPolicyError}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                  if (passwordPolicyError) setPasswordPolicyError("");
                }}
                slotProps={{
                  // Both: setting it replaces the reference MUI would add to the
                  // helper text, and the error must still be announced.
                  htmlInput: {
                    "aria-describedby": passwordPolicyError
                      ? `${PASSWORD_FIELD_ID}-helper-text ${POLICY_HINT_ID}`
                      : POLICY_HINT_ID,
                  },
                }}
              />
              <PasswordPolicyHint id={POLICY_HINT_ID} />
            </Box>

            <PasswordInput
              label="Confirmar contraseña"
              variant="outlined"
              fullWidth
              required
              autoComplete="new-password"
              value={passwordConfirm}
              error={!!passwordError}
              helperText={passwordError}
              onChange={(e) => {
                setPasswordConfirm(e.target.value);
                if (passwordError) setPasswordError("");
              }}
            />
          </>
        )}

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={isPending || disabled}
          sx={{
            mt: 2,
            py: 1.5,
            fontSize: fontSizes.xl,
            fontWeight: 600,
            "&:hover": {
              background: `linear-gradient(135deg, ${colors.brand.dark} 0%, ${colors.brand.panel} 100%)`,
            },
          }}
        >
          {isPending ? <CircularProgress size={24} color="inherit" /> : submitLabel}
        </Button>
      </Box>
    </Box>
  );
};
