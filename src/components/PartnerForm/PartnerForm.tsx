import { useState, type FC } from "react";
import { sxStyles } from "../../theme/sx";
import {
  Box,
  Button,
  CircularProgress,
  TextField,
} from "@mui/material";
import { colors, fontSizes } from "../../theme/tokens";

export interface PartnerFormValues {
  fullName: string;
  personalId: string;
  email: string;
  address: string;
  phoneNumber: string;
  number?: number;
  password?: string;
}

interface PartnerFormProps {
  mode: "create" | "edit";
  initialValues?: Partial<PartnerFormValues>;
  handleSubmit: (values: PartnerFormValues) => void;
  isPending: boolean;
  submitLabel: string;
  disabled?: boolean;
}


export const PartnerForm: FC<PartnerFormProps> = ({
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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "create" && password !== passwordConfirm) {
      setPasswordError("Las contraseñas no coinciden");
      return;
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
            <TextField
              label="Contraseña"
              variant="outlined"
              fullWidth
              required
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError("");
              }}
                />

            <TextField
              label="Confirmar contraseña"
              variant="outlined"
              fullWidth
              required
              type="password"
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
              background: `linear-gradient(135deg, ${colors.brand.dark} 0%, #6a3f8f 100%)`,
            },
          }}
        >
          {isPending ? <CircularProgress size={24} color="inherit" /> : submitLabel}
        </Button>
      </Box>
    </Box>
  );
};
