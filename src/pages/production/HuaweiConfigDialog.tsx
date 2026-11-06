import { useState, type FC, type FormEvent } from "react";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import InfoOutlineIcon from "@mui/icons-material/InfoOutlined";
import type { ConfigureHuaweiBody, GetHuaweiConfigResponse } from "../../api/models";
import type { Action, HuaweiWriteResult } from "../../hooks/actions";
import { useCredentialsForm } from "../../hooks/useCredentialsForm";
import { buildCredentialsBody, passwordRequiredMessage } from "../../utils/integrationCredentials";
import { colors } from "../../theme/tokens";
import { CredentialsFields } from "../integrations/CredentialsFields";
import {
  HUAWEI_ACCENT,
  HUAWEI_HELP,
  HUAWEI_URL_PLACEHOLDER,
  SAVE_FAILED_MESSAGE,
} from "./huaweiConfig";
import { AppModal } from "../../components/Modals/AppModal";
import { ModalCancelButton } from "../../components/Modals/ModalCancelButton";

export interface HuaweiConfigDialogProps {
  /** `create` when the plant has no configuration (a 404), `edit` otherwise. */
  mode: "create" | "edit";
  /** The stored configuration; read only in `edit` mode. */
  stored: GetHuaweiConfigResponse | undefined;
  /** Whether a password is stored, as `storedPasswordFrom` answers it. */
  passwordSet: boolean | undefined;
  configure: Action<[ConfigureHuaweiBody], HuaweiWriteResult>;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * The Huawei configuration form of one plant, in the shared overlay (#371).
 *
 * It follows the Datadis form's rules (UI-INT-001…004) through the same
 * helpers. It neither shows nor sends `enabled`: the backend creates a new
 * configuration disabled, and an edit leaves it as it is (UI-INT-008).
 * Turning it on or off is the card's switch, through its own endpoints.
 */
export const HuaweiConfigDialog: FC<HuaweiConfigDialogProps> = ({
  mode,
  stored,
  passwordSet,
  configure,
  onClose,
  onSaved,
}) => {
  // What the form opened with: the stored username and URL in edit mode, and
  // never a password, which is write-only.
  const [initial] = useState(() => ({
    username: mode === "edit" ? (stored?.username ?? "") : "",
    password: "",
    baseUrl: mode === "edit" ? (stored?.baseUrl ?? "") : "",
  }));
  const [values, setValues] = useState(initial);
  const dirty =
    values.username !== initial.username || values.password !== initial.password || values.baseUrl !== initial.baseUrl;
  const [failed, setFailed] = useState(false);

  // Nothing is stored before a create, so the password is required then.
  const storedPassword = mode === "create" ? false : passwordSet;
  const form = useCredentialsForm(values, storedPassword);
  const isSaving = configure.isPending;

  const save = async (event: FormEvent<HTMLElement>) => {
    event.preventDefault();
    setFailed(false);
    if (!form.attemptSave()) return;

    const sentPassword = values.password;
    const result = await configure.run(buildCredentialsBody(values));
    if ("ok" in result) {
      setValues((current) => ({ ...current, password: "" }));
      form.reset();
      onSaved();
      return;
    }
    const passwordRequired = passwordRequiredMessage(result.error, "HUAWEI_CONFIG_PASSWORD_REQUIRED");
    if (passwordRequired) form.showPasswordRefusal(passwordRequired, sentPassword);
    else setFailed(true);
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      size="form"
      title={mode === "create" ? "Configurar integración con Huawei" : "Editar integración con Huawei"}
      dismissible={!isSaving}
      dirty={dirty}
      onSubmit={(event) => void save(event)}
      actions={
        <>
          <ModalCancelButton disabled={isSaving} />
          <Button
            type="submit"
            variant="contained"
            disabled={isSaving}
            // Pressing Guardar would first blur the field being edited, and the
            // message that blur reveals moves the button before the press ends,
            // losing the click. Same reason as IntegrationCard's Guardar.
            onMouseDown={(e) => e.preventDefault()}
            startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        </>
      }
    >
      <Box>
        <CredentialsFields
          value={{ ...values, passwordSet: storedPassword }}
          onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
          errors={form.errors}
          onFieldBlur={form.touch}
          accent={HUAWEI_ACCENT}
          urlPlaceholder={HUAWEI_URL_PLACEHOLDER}
          readOnly={isSaving}
        />
        <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <InfoOutlineIcon sx={{ fontSize: 16, color: colors.text.muted }} />
          <Typography variant="caption" sx={{ color: colors.text.subtle }}>
            {HUAWEI_HELP}
          </Typography>
        </Box>
        {failed && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {SAVE_FAILED_MESSAGE}
          </Alert>
        )}
      </Box>
    </AppModal>
  );
};
