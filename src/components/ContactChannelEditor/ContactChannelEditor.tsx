import { useCallback, useEffect, useId, useRef, useState, type FC, type FormEvent, type ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  SwipeableDrawer,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { ContactChannelBodyType } from "../../api/models";
import { colors, radii } from "../../theme/tokens";
import {
  CONTACT_CHANNEL_FIELDS,
  CONTACT_CHANNEL_LIMITS,
  validateChannel,
  type ContactChannelDraft,
  type ContactChannelErrors,
  type ContactChannelField,
} from "../../utils/contactChannelRules";
import { CONTACT_CHANNEL_TYPE_LABELS } from "../ContactChannelList/channelTypes";

/**
 * Where a save stands, as the page that sends it knows: in flight, refused for
 * a reason the editor shows at the top, or refused because the caller may no
 * longer edit. A refusal on a field comes in `fieldErrors` instead.
 */
export type ContactChannelEditorStatus = "idle" | "saving" | "serverError" | "offline" | "lostRights";

export interface ContactChannelEditorProps {
  open: boolean;
  /** Editing a stored channel, or adding a new one (no delete action, "Añadir canal" to save). */
  mode: "edit" | "add";
  /** The channel as stored, or a blank one when adding. Changes are measured against it. */
  initialChannel: ContactChannelDraft;
  /** The community the channel belongs to, shown under the title. */
  communityName?: string;
  status?: ContactChannelEditorStatus;
  /** A server refusal of the save, by field. Each new object is placed and focused. */
  fieldErrors?: ContactChannelErrors;
  onSave: (draft: ContactChannelDraft) => void;
  /** Asks to delete the channel; the page confirms it. Only in edit mode. */
  onDelete?: () => void;
  /** Closes without saving: nothing changed, or the changes were discarded. */
  onClose: () => void;
  /** Closes after the caller lost the right to edit, so the page can refresh what they may do. */
  onLostRightsClose: () => void;
}

interface ValueFieldConfig {
  label: string;
  example: string;
  helper: string;
  type?: string;
  inputMode?: "tel" | "email" | "text";
  autoComplete: string;
  multiline?: boolean;
  noAutoCorrect?: boolean;
}

// The value field follows the type, keeping what was typed (#296).
const VALUE_FIELD: Record<ContactChannelBodyType, ValueFieldConfig> = {
  PHONE: {
    label: "Número de teléfono",
    example: "Por ejemplo: 600 123 456",
    helper: "Solo números y espacios. Puedes empezar por + para el prefijo.",
    type: "tel",
    inputMode: "tel",
    autoComplete: "tel",
  },
  EMAIL: {
    label: "Email",
    example: "Por ejemplo: contacto@micomunidad.es",
    helper: "La dirección a la que pueden escribir los miembros.",
    type: "email",
    inputMode: "email",
    autoComplete: "email",
    noAutoCorrect: true,
  },
  ADDRESS: {
    label: "Dirección",
    example: "Por ejemplo: Calle Mayor 3, 44100 Albarracín (Teruel)",
    helper: "Calle, número, código postal y localidad.",
    autoComplete: "street-address",
    multiline: true,
  },
};

const TYPES: ContactChannelBodyType[] = ["PHONE", "EMAIL", "ADDRESS"];

const ALERTS: Record<"serverError" | "offline" | "lostRights", ReactNode> = {
  serverError: (
    <>
      <strong>No se ha guardado el canal.</strong> El servidor no ha aceptado los cambios. Tus datos siguen aquí:
      inténtalo de nuevo en unos minutos.
    </>
  ),
  offline: (
    <>
      <strong>No se ha guardado el canal.</strong> No hay conexión. Tus datos siguen aquí: vuelve a pulsar Guardar
      cuando tengas cobertura.
    </>
  ),
  lostRights: "Ya no puedes editar el contacto de esta comunidad. No se han guardado los cambios.",
};

const sameDraft = (a: ContactChannelDraft, b: ContactChannelDraft) =>
  CONTACT_CHANNEL_FIELDS.every((field) => a[field] === b[field]);

type TextFieldName = Exclude<ContactChannelField, "type">;

/**
 * One contact channel, edited on its own (#296): a bottom sheet below the `md`
 * breakpoint, a 560 px dialog from it up, with the same content. Both trap
 * focus while open. The checks of lucoenergia/conluz#462 run on save, and again
 * on a field in error when it loses focus. Closing with unsaved changes asks
 * first, in the footer, rather than in a second dialog.
 */
export const ContactChannelEditor: FC<ContactChannelEditorProps> = ({
  open,
  mode,
  initialChannel,
  communityName,
  status = "idle",
  fieldErrors,
  onSave,
  onDelete,
  onClose,
  onLostRightsClose,
}) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const titleId = useId();
  const [draft, setDraft] = useState(initialChannel);
  const [errors, setErrors] = useState<ContactChannelErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [askingToClose, setAskingToClose] = useState(false);
  const fieldRefs = useRef<Partial<Record<TextFieldName, HTMLInputElement | HTMLTextAreaElement | null>>>({});
  const typeRef = useRef<HTMLInputElement | null>(null);
  const lastFieldRef = useRef<HTMLElement | null>(null);
  const alertRef = useRef<HTMLDivElement | null>(null);

  const saving = status === "saving";
  const lostRights = status === "lostRights";
  const readOnly = saving || lostRights;
  const dirty = !sameDraft(draft, initialChannel);
  const alert = status === "serverError" || status === "offline" || lostRights ? ALERTS[status] : null;
  const valueField = VALUE_FIELD[draft.type];

  const focusField = useCallback((field: ContactChannelField) => {
    const element = field === "type" ? typeRef.current : fieldRefs.current[field];
    element?.scrollIntoView?.({ block: "center" });
    element?.focus();
  }, []);

  // A server refusal on the fields is placed like the editor's own checks.
  useEffect(() => {
    if (!fieldErrors) return;
    setErrors(fieldErrors);
    setAttempted(true);
    const first = CONTACT_CHANNEL_FIELDS.find((field) => fieldErrors[field]);
    if (first) focusField(first);
  }, [fieldErrors, focusField]);

  // A refusal shown at the top takes focus, so it is read out first.
  useEffect(() => {
    if (alert) alertRef.current?.focus();
  }, [status, alert]);

  const update = (field: ContactChannelField, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setAskingToClose(false);
  };

  const recheck = (field: ContactChannelField) => {
    if (!attempted) return;
    const message = validateChannel(draft)[field];
    setErrors((current) => ({ ...current, [field]: message }));
  };

  const save = (event?: FormEvent) => {
    event?.preventDefault();
    if (readOnly) return;
    const found = validateChannel(draft);
    setAttempted(true);
    setErrors(found);
    const first = CONTACT_CHANNEL_FIELDS.find((field) => found[field]);
    if (first) {
      focusField(first);
      return;
    }
    onSave(draft);
  };

  const requestClose = () => {
    if (saving) return;
    if (lostRights) onLostRightsClose();
    else if (dirty) setAskingToClose(true);
    else onClose();
  };

  const keepEditing = () => {
    setAskingToClose(false);
    lastFieldRef.current?.focus();
  };

  const rememberFocus = (event: { currentTarget: HTMLElement }) => {
    lastFieldRef.current = event.currentTarget;
  };

  const textField = (field: TextFieldName, label: string, helper: string, extra: Partial<ValueFieldConfig> = {}) => {
    const error = errors[field];
    const counter =
      field === "notes" ? `${draft.notes.length} de ${CONTACT_CHANNEL_LIMITS.notes} caracteres.` : undefined;
    return (
      <TextField
        label={label}
        value={draft[field]}
        onChange={(event) => update(field, event.target.value)}
        onBlur={() => recheck(field)}
        onFocus={rememberFocus}
        placeholder={extra.example}
        type={extra.multiline ? undefined : extra.type}
        multiline={extra.multiline || field === "notes"}
        minRows={field === "notes" ? 3 : extra.multiline ? 2 : undefined}
        error={!!error}
        fullWidth
        // A new channel starts at its name; the type is already Teléfono.
        autoFocus={mode === "add" && field === "label"}
        inputRef={(element: HTMLInputElement | HTMLTextAreaElement | null) => {
          fieldRefs.current[field] = element;
        }}
        helperText={
          counter ? (
            <Box component="span" sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
              <span>{error ?? helper}</span>
              <Box component="span" sx={{ flexShrink: 0 }}>
                {counter}
              </Box>
            </Box>
          ) : (
            (error ?? helper)
          )
        }
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: {
            readOnly,
            inputMode: extra.inputMode,
            autoComplete: extra.autoComplete ?? "off",
            ...(extra.noAutoCorrect ? { autoCapitalize: "none", autoCorrect: "off", spellCheck: false } : {}),
          },
        }}
      />
    );
  };

  const deleteButton = mode === "edit" && onDelete && !readOnly && (
    <Button
      color="error"
      variant="text"
      size="large"
      startIcon={<DeleteOutlineIcon />}
      onClick={onDelete}
      sx={{ alignSelf: "flex-start", minHeight: 44, mr: isDesktop ? "auto" : 0 }}
    >
      Eliminar canal
    </Button>
  );

  const footer = (() => {
    if (saving) {
      return (
        <Button
          variant="contained"
          size="large"
          aria-disabled
          startIcon={<CircularProgress size={18} color="inherit" />}
          sx={{ minHeight: 44, flex: { xs: 1, md: "none" } }}
        >
          Guardando…
        </Button>
      );
    }
    if (lostRights) {
      return (
        <Button variant="contained" size="large" onClick={onLostRightsClose} sx={{ minHeight: 44, flex: { xs: 1, md: "none" } }}>
          Cerrar
        </Button>
      );
    }
    if (askingToClose) {
      return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
          <Typography role="alert" variant="body2" sx={{ color: colors.text.body }}>
            Tienes cambios sin guardar en este canal. Si cierras, se perderán.
          </Typography>
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
            <Button variant="outlined" size="large" onClick={onClose} sx={{ minHeight: 44, flex: { xs: 1, md: "none" } }}>
              Descartar cambios
            </Button>
            <Button
              variant="contained"
              size="large"
              onClick={keepEditing}
              autoFocus
              sx={{ minHeight: 44, flex: { xs: 1, md: "none" } }}
            >
              Seguir editando
            </Button>
          </Box>
        </Box>
      );
    }
    return (
      <>
        {isDesktop && deleteButton}
        <Button variant="outlined" size="large" onClick={requestClose} sx={{ minHeight: 44, flex: { xs: 1, md: "none" } }}>
          Cancelar
        </Button>
        <Button variant="contained" size="large" type="submit" sx={{ minHeight: 44, flex: { xs: 1, md: "none" } }}>
          {mode === "add" ? "Añadir canal" : "Guardar"}
        </Button>
      </>
    );
  })();

  const content = (
    <Box
      component="form"
      noValidate
      onSubmit={save}
      sx={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}
    >
      {!isDesktop && (
        <Box aria-hidden sx={{ width: 36, height: 4, borderRadius: radii.small, bgcolor: colors.border.inactive, mx: "auto", mt: 1 }} />
      )}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1,
          borderBottom: 1,
          borderColor: "divider",
          p: { xs: "4px 8px 12px 16px", md: "16px 16px 16px 24px" },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0, pt: 1 }}>
          <Typography id={titleId} variant="h6" component="h2">
            {mode === "add" ? "Nuevo canal" : "Editar canal"}
          </Typography>
          {communityName && (
            <Typography variant="body2" sx={{ color: colors.text.subtle }}>
              {communityName}
            </Typography>
          )}
        </Box>
        {!saving && (
          <IconButton aria-label="Cerrar" onClick={requestClose} sx={{ width: 44, height: 44 }}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      <Box sx={{ overflowY: "auto", p: { xs: 2, md: 3 }, display: "flex", flexDirection: "column", gap: 2.5 }}>
        {alert && (
          <Alert severity="error" role="alert" ref={alertRef} tabIndex={-1}>
            {alert}
          </Alert>
        )}

        <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
          <Typography component="legend" variant="subtitle2" sx={{ mb: 1 }}>
            Tipo de canal
          </Typography>
          <RadioGroup
            row
            value={draft.type}
            onChange={(event) => update("type", event.target.value)}
            sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}
          >
            {TYPES.map((type, index) => {
              const selected = draft.type === type;
              return (
                <FormControlLabel
                  key={type}
                  value={type}
                  disabled={readOnly}
                  label={CONTACT_CHANNEL_TYPE_LABELS[type]}
                  labelPlacement="bottom"
                  control={
                    <Radio
                      inputRef={index === 0 ? typeRef : undefined}
                      onFocus={rememberFocus}
                    />
                  }
                  sx={{
                    m: 0,
                    py: 1,
                    border: 1,
                    borderRadius: radii.default,
                    borderColor: selected ? "primary.main" : "divider",
                    backgroundColor: selected ? colors.brand.surface : "transparent",
                    "& .MuiFormControlLabel-label": { fontWeight: selected ? 600 : 400 },
                  }}
                />
              );
            })}
          </RadioGroup>
        </Box>

        {textField("label", "Nombre del canal", "Cómo lo verán los miembros: «Oficina», «Tesorería» o el nombre de quien atiende.", {
          example: "Por ejemplo: Oficina",
          autoComplete: "off",
        })}
        {textField("value", valueField.label, valueField.helper, valueField)}
        {textField("schedule", "Horario (opcional)", "Cuándo se puede contactar por este canal.", {
          example: "Por ejemplo: lunes a viernes, de 10:00 a 14:00",
          autoComplete: "off",
        })}
        {textField("notes", "Notas (opcional)", "Cualquier detalle útil para los miembros.", {
          example: "Por ejemplo: si no contestamos, deja un mensaje.",
          autoComplete: "off",
        })}

        {!isDesktop && !askingToClose && deleteButton}
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 1,
          justifyContent: "flex-end",
          alignItems: "center",
          borderTop: 1,
          borderColor: "divider",
          p: { xs: "12px 16px 16px", md: "16px 24px" },
        }}
      >
        {footer}
      </Box>
    </Box>
  );

  if (isDesktop) {
    return (
      <Dialog
        open={open}
        onClose={requestClose}
        aria-labelledby={titleId}
        slotProps={{ paper: { sx: { width: 560, maxWidth: "calc(100% - 32px)", borderRadius: radii.large, m: 2 } } }}
      >
        {content}
      </Dialog>
    );
  }

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={requestClose}
      onOpen={() => {}}
      disableSwipeToOpen
      // A drawer sits on the drawer layer, under the app bar (Header lifts it
      // above the side menu); this one is a modal sheet, so it goes on top.
      sx={{ zIndex: (theme) => theme.zIndex.modal }}
      slotProps={{
        paper: {
          role: "dialog",
          "aria-modal": true,
          "aria-labelledby": titleId,
          sx: {
            maxHeight: "calc(100% - 24px)",
            borderRadius: `${radii.large} ${radii.large} 0 0`,
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
    >
      {content}
    </SwipeableDrawer>
  );
};
