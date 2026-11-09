import { useEffect, useRef, useState, type FC, type FormEvent, type ReactNode } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import type { SupplyResponse } from "../../api/models";
import { AppModal } from "../../components/Modals/AppModal";
import { ModalCancelButton } from "../../components/Modals/ModalCancelButton";
import { CommunityScopeHeader } from "../../components/CommunityScopeHeader";
import { EmptyState } from "../../components/EmptyState";
import { LoadErrorAlert } from "../../components/LoadErrorAlert";
import { SupplyFormFields } from "../../components/SupplyForm/SupplyFormFields";
import {
  EMPTY_SUPPLY_FIELD_VALUES,
  isOwnerUnavailable,
  selectedOwnerOf,
  type SupplyFieldValues,
  type SupplyFormField,
  type SupplyOwnerField,
} from "../../components/SupplyForm/supplyFields";
import { useActiveCommunity } from "../../context/community.context";
import { useErrorDispatch } from "../../context/error.context";
import { useCommunityActions, useSupplyActions } from "../../hooks/actions";
import { useActiveCommunityResource } from "../../hooks/useActiveCommunityResource";
import { communityLabel, useActiveCommunityName } from "../../hooks/useActiveCommunityName";
import { supplyDisplayLabel } from "../../utils/supplyDisplayLabel";
import { supplyRefusalOf } from "./supplyForm";
import { useSupplyInActiveCommunity } from "./useSupplyInActiveCommunity";
import { useSupplyOwnerOptions } from "./useSupplyOwnerOptions";

/** Which supply form the list opened: a new supply, or an existing one by id. */
export type SupplyFormTarget = { kind: "create" } | { kind: "edit"; supplyId: string };

interface SupplyFormDialogProps {
  target: SupplyFormTarget;
  onClose: () => void;
}

/**
 * Creates or edits a supply in the shared overlay, over the supply list
 * (UI-SUP-019). Mounted on open, so every opening starts from its own values.
 */
export const SupplyFormDialog: FC<SupplyFormDialogProps> = ({ target, onClose }) =>
  target.kind === "create" ? (
    <CreateSupplyDialog onClose={onClose} />
  ) : (
    <EditSupplyDialog supplyId={target.supplyId} onClose={onClose} />
  );

type SaveOutcome = { ok: true } | { error: unknown };

/** An empty input is sent as no value rather than an empty one. */
const optional = (value: string) => value || undefined;

const CreateSupplyDialog: FC<{ onClose: () => void }> = ({ onClose }) => {
  const communityName = useActiveCommunityName();
  const activeCommunityId = useActiveCommunity();
  const activeCommunity = useActiveCommunityResource();
  const { createSupply } = useCommunityActions().forCommunity(activeCommunity).actions;
  const owner = useSupplyOwnerOptions();

  const save = async (values: SupplyFieldValues): Promise<SaveOutcome | undefined> => {
    const personalId = selectedOwnerOf(owner, values.ownerId)?.personalId;
    // The owner input is required; without a chosen member there is nobody to send.
    if (!activeCommunityId || !createSupply || !personalId) return undefined;
    return createSupply.run({
      name: optional(values.name),
      code: values.cups,
      address: values.address,
      personalId,
      // Optional since the backend accepts a supply without one; sending the
      // empty string instead would store a blank reference as if it were data.
      addressRef: optional(values.addressRef),
      communityId: activeCommunityId,
    });
  };

  return (
    <SupplyFormOverlay
      title={`Crear punto de suministro en ${communityLabel(communityName)}`}
      scopeHeader={<CommunityScopeHeader name={communityName} />}
      owner={owner}
      seeded={EMPTY_SUPPLY_FIELD_VALUES}
      submitLabel="Crear punto de suministro"
      pendingLabel="Creando..."
      save={createSupply && save}
      generic="Ha habido un problema al crear un nuevo punto de suministro. Por favor, inténtalo más tarde"
      onClose={onClose}
    />
  );
};

const valuesOf = (supply: SupplyResponse): SupplyFieldValues => ({
  name: supply.name ?? "",
  cups: supply.code,
  address: supply.address,
  addressRef: supply.addressRef ?? "",
  ownerId: null,
});

const EditSupplyDialog: FC<{ supplyId: string; onClose: () => void }> = ({ supplyId, onClose }) => {
  const { supply, isNotFound, error, refetch } = useSupplyInActiveCommunity(supplyId);
  const { edit } = useSupplyActions().forSupply(supply).actions;
  // Seeded once, from the first read: a refetch while the form is open (focus,
  // an invalidation) must not overwrite what is being typed (#372).
  const [seeded, setSeeded] = useState<SupplyFieldValues>();
  if (!seeded && supply) setSeeded(valuesOf(supply));

  const save = (values: SupplyFieldValues): Promise<SaveOutcome> | undefined =>
    edit?.run({
      code: values.cups,
      address: values.address,
      // An empty name is sent as null, as the form always has, so that clearing it clears it.
      name: values.name || (null as unknown as undefined),
      // Optional since the backend accepts a supply without one; sending the
      // empty string instead would store a blank reference as if it were data.
      addressRef: optional(values.addressRef),
    });

  // The same answers the supply detail page gives for a supply it cannot show.
  const status = isNotFound ? (
    <EmptyState
      icon={SearchOffIcon}
      title="Punto de suministro no encontrado"
      subtitle="Este punto de suministro no existe o no tienes acceso a su comunidad."
    />
  ) : error ? (
    <LoadErrorAlert
      message="Ha habido un problema al cargar la información de este punto de suministro. Por favor, inténtalo más tarde"
      onRetry={() => void refetch()}
    />
  ) : (
    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
      <CircularProgress aria-label="Cargando..." />
    </Box>
  );

  return (
    <SupplyFormOverlay
      title="Editar punto de suministro"
      // Under the title, the supply as the app names it everywhere (UI-SUP-010).
      lead={supply && <Typography color="text.secondary">{supplyDisplayLabel(supply)}</Typography>}
      owner={{ mode: "show", fullName: supply?.ownerRecord?.fullName ?? null }}
      seeded={seeded}
      status={status}
      submitLabel={seeded?.name ? "Guardar cambios" : "Crear punto de suministro"}
      pendingLabel="Guardando..."
      save={edit && save}
      generic="Ha habido un problema al editar el punto de suministro. Por favor, inténtalo más tarde"
      onClose={onClose}
    />
  );
};

interface SupplyFormOverlayProps {
  title: string;
  scopeHeader?: ReactNode;
  /** Shown above the fields. */
  lead?: ReactNode;
  owner: SupplyOwnerField;
  /** The values the form opened with; until there are some, `status` shows instead. */
  seeded: SupplyFieldValues | undefined;
  status?: ReactNode;
  submitLabel: string;
  pendingLabel: string;
  /** Absent when the caller may not save; resolves to nothing when nothing was sent. */
  save: ((values: SupplyFieldValues) => Promise<SaveOutcome | undefined> | undefined) | undefined;
  /** What a refusal that is not about one input says. */
  generic: string;
  onClose: () => void;
}

const SupplyFormOverlay: FC<SupplyFormOverlayProps> = ({
  title,
  scopeHeader,
  lead,
  owner,
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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<SupplyFormField, string>>>({});
  // The ref answers a second submit before the first has re-rendered; the
  // state locks the overlay and the inputs (UI-OVL-002).
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [refusedField, setRefusedField] = useState<SupplyFormField | null>(null);
  const cupsRef = useRef<HTMLInputElement>(null);
  const ownerRef = useRef<HTMLInputElement>(null);

  const dirty =
    !!values &&
    !!seeded &&
    (Object.keys(seeded) as (keyof SupplyFieldValues)[]).some((field) => values[field] !== seeded[field]);

  // Once the inputs are editable again, the refused one takes focus.
  useEffect(() => {
    if (saving || !refusedField) return;
    (refusedField === "cups" ? cupsRef : ownerRef).current?.focus();
    setRefusedField(null);
  }, [saving, refusedField]);

  const handleSubmit = async (event: FormEvent<HTMLElement>) => {
    event.preventDefault();
    if (!values || !save || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setFieldErrors({});
    const outcome = await save(values);
    savingRef.current = false;
    setSaving(false);
    if (!outcome) return;
    if ("ok" in outcome) {
      onClose();
      return;
    }
    // The form stays as it was typed, so the admin corrects the one input.
    const refusal = supplyRefusalOf(outcome.error, generic, { ownerField: owner.mode === "choose" });
    if ("field" in refusal) {
      setFieldErrors({ [refusal.field]: refusal.message });
      setRefusedField(refusal.field);
    } else {
      errorDispatch(refusal.form);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={title}
      scopeHeader={scopeHeader}
      dismissible={!saving}
      dirty={dirty}
      onSubmit={handleSubmit}
      actions={
        <>
          <ModalCancelButton disabled={saving} />
          <Button
            type="submit"
            variant="contained"
            disabled={saving || !values || !save || isOwnerUnavailable(owner)}
            startIcon={saving ? <CircularProgress color="inherit" size={16} /> : undefined}
          >
            {saving ? pendingLabel : submitLabel}
          </Button>
        </>
      }
    >
      {lead}
      {values ? (
        <SupplyFormFields
          values={values}
          onChange={(field, value) => setValues((current) => current && { ...current, [field]: value })}
          fieldErrors={fieldErrors}
          onFieldEdit={(field) => setFieldErrors((errors) => ({ ...errors, [field]: undefined }))}
          owner={owner}
          readOnly={saving}
          cupsInputRef={cupsRef}
          ownerInputRef={ownerRef}
        />
      ) : (
        status
      )}
    </AppModal>
  );
};
