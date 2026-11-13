import { useRef, useState, type FC, type FormEvent, type ReactNode, type RefObject } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import type { CreateCommunityBody, UpdateCommunityBody } from "../../api/models";
import { useGetCommunityById } from "../../api/communities/communities";
import { AppModal } from "../../components/Modals/AppModal";
import { ModalCancelButton } from "../../components/Modals/ModalCancelButton";
import { LoadErrorAlert } from "../../components/LoadErrorAlert";
import { useErrorDispatch } from "../../context/error.context";
import { useCommunityActions, usePlatformActions } from "../../hooks/actions";
import { communityRefusalOf, isNotFoundError } from "./communityForm";
import {
  EMPTY_COMMUNITY_FIELD_VALUES,
  communityFieldErrors,
  communityFieldValuesOf,
  type CommunityFieldValues,
  type CommunityFormInput,
} from "./communityFields";
import { CommunityFormFields } from "./CommunityFormFields";
import { CommunityNotFound } from "./CommunityNotFound";

/** Which community form a page opened: a new community, or an existing one by id. */
export type CommunityFormTarget = { kind: "create" } | { kind: "edit"; communityId: string };

interface CommunityFormDialogProps {
  target: CommunityFormTarget;
  onClose: () => void;
}

/**
 * Creates or edits a community in the shared overlay, over the page that
 * offered it (#374). Mounted on open, so every opening starts from its own
 * values.
 */
export const CommunityFormDialog: FC<CommunityFormDialogProps> = ({ target, onClose }) =>
  target.kind === "create" ? (
    <CommunityCreateForm onClose={onClose} />
  ) : (
    <CommunityEditForm communityId={target.communityId} onClose={onClose} />
  );

type SaveOutcome = { ok: true } | { error: unknown };

/** What the form sends, from what it holds. An empty optional input is sent as no value. */
const bodyOf = (values: CommunityFieldValues): CreateCommunityBody & UpdateCommunityBody => ({
  name: values.name.trim(),
  code: values.code.trim(),
  legalId: values.legalId.trim() || undefined,
  address: values.address.trim() || undefined,
});

const CommunityCreateForm: FC<{ onClose: () => void }> = ({ onClose }) => {
  const { createCommunity } = usePlatformActions().actions;

  return (
    <CommunityFormOverlay
      title="Crear nueva comunidad"
      seeded={EMPTY_COMMUNITY_FIELD_VALUES}
      submitLabel="Crear comunidad"
      pendingLabel="Creando..."
      save={createCommunity && ((body) => createCommunity.run(body))}
      generic="Ha habido un problema al crear la comunidad. Por favor, inténtalo más tarde."
      onClose={onClose}
    />
  );
};

const CommunityEditForm: FC<{ communityId: string; onClose: () => void }> = ({ communityId, onClose }) => {
  const { data: community, error, refetch } = useGetCommunityById(communityId);
  // The community itself carries the answer, and the action invalidates both
  // the community and the list.
  const { update } = useCommunityActions().forCommunity(community).actions;
  // Seeded once, from the first read: a refetch while the form is open (focus,
  // an invalidation) must not overwrite what is being typed (#374).
  const [seeded, setSeeded] = useState<CommunityFieldValues>();
  if (!seeded && community) setSeeded(communityFieldValuesOf(community));

  const status = isNotFoundError(error) ? (
    <CommunityNotFound />
  ) : error ? (
    <LoadErrorAlert
      message="No se pudo cargar la información de la comunidad."
      onRetry={() => void refetch()}
    />
  ) : (
    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
      <CircularProgress aria-label="Cargando..." />
    </Box>
  );

  return (
    <CommunityFormOverlay
      title="Editar comunidad"
      lead={community && <Typography color="text.secondary">{community.name}</Typography>}
      seeded={seeded}
      status={status}
      // Editing is not creating, whatever the community is called.
      submitLabel="Guardar"
      pendingLabel="Guardando..."
      save={update && ((body) => update.run(body))}
      generic="Ha habido un problema al editar la comunidad. Por favor, inténtalo más tarde."
      onClose={onClose}
    />
  );
};

interface CommunityFormOverlayProps {
  title: string;
  /** Shown above the fields. */
  lead?: ReactNode;
  /** The values the form opened with; until there are some, `status` shows instead. */
  seeded: CommunityFieldValues | undefined;
  status?: ReactNode;
  submitLabel: string;
  pendingLabel: string;
  /** Absent when the caller may not save. */
  save: ((body: CreateCommunityBody & UpdateCommunityBody) => Promise<SaveOutcome>) | undefined;
  /** What a refusal without a field of its own says. */
  generic: string;
  onClose: () => void;
}

const CommunityFormOverlay: FC<CommunityFormOverlayProps> = ({
  title,
  lead,
  seeded,
  status,
  submitLabel,
  pendingLabel,
  save,
  generic,
  onClose,
}) => {
  const errorDispatch = useErrorDispatch();
  const [values, setValues] = useState(seeded);
  if (seeded && !values) setValues(seeded);
  // Validation and API refusals alike, on the input they are about.
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<CommunityFormInput, string>>>({});
  // The ref answers a second submit before the first has re-rendered; the
  // state locks the overlay and the inputs (UI-OVL-002).
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const inputRefs: Record<CommunityFormInput, RefObject<HTMLInputElement | HTMLTextAreaElement | null>> = {
    name: useRef(null),
    code: useRef(null),
    legalId: useRef(null),
    address: useRef(null),
  };

  const dirty =
    !!values &&
    !!seeded &&
    (Object.keys(seeded) as CommunityFormInput[]).some((field) => values[field] !== seeded[field]);

  const onChange = (field: CommunityFormInput, value: string) => {
    // Editing an input clears what was said about it.
    setFieldErrors((errors) => ({ ...errors, [field]: undefined }));
    setValues((current) => current && { ...current, [field]: value });
  };

  const handleSubmit = async (event: FormEvent<HTMLElement>) => {
    event.preventDefault();
    if (!values || !save || savingRef.current) return;
    // Nothing is sent while an input is wrong: each says why, and the first
    // takes focus.
    const errors = communityFieldErrors(values);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors));
      inputRefs[errors[0][0]].current?.focus();
      return;
    }
    savingRef.current = true;
    setSaving(true);
    const outcome = await save(bodyOf(values));
    savingRef.current = false;
    setSaving(false);
    if ("ok" in outcome) {
      onClose();
      return;
    }
    // The form stays as it was typed. A duplicate or a too long address goes
    // on the input it names (UI-ERR-002), which takes focus; anything else to
    // the snackbar.
    const refusal = communityRefusalOf(outcome.error, generic);
    if ("field" in refusal) {
      setFieldErrors({ [refusal.field]: refusal.message });
      inputRefs[refusal.field].current?.focus();
    } else {
      errorDispatch(refusal.form);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={title}
      dismissible={!saving}
      dirty={dirty}
      onSubmit={handleSubmit}
      actions={
        <>
          <ModalCancelButton disabled={saving} />
          <Button
            type="submit"
            variant="contained"
            disabled={saving || !values || !save}
            startIcon={saving ? <CircularProgress color="inherit" size={16} /> : undefined}
          >
            {saving ? pendingLabel : submitLabel}
          </Button>
        </>
      }
    >
      {lead}
      {values ? (
        <CommunityFormFields
          values={values}
          onChange={onChange}
          fieldErrors={fieldErrors}
          readOnly={saving}
          inputRefs={inputRefs}
        />
      ) : (
        status
      )}
    </AppModal>
  );
};
