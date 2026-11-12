import { useRef, useState, type FC, type FormEvent, type ReactNode, type RefObject } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import type { CreatePlantBody, SupplyResponse, UpdatePlantBody } from "../../api/models";
import { useGetAllSupplies } from "../../api/supplies/supplies";
import { AppModal } from "../../components/Modals/AppModal";
import { ModalCancelButton } from "../../components/Modals/ModalCancelButton";
import { CommunityScopeHeader } from "../../components/CommunityScopeHeader";
import { EmptyState } from "../../components/EmptyState";
import { LoadErrorAlert } from "../../components/LoadErrorAlert";
import { PlantFormFields } from "../../components/PlantForm/PlantFormFields";
import {
  EMPTY_PLANT_FIELD_VALUES,
  plantFieldValuesOf,
  selectedSupplyOf,
  plantFieldErrors,
  TOTAL_POWER_ERROR,
  totalPowerIsValid,
  type PlantFieldValues,
  type PlantFormField,
} from "../../components/PlantForm/plantFields";
import { useActiveCommunity } from "../../context/community.context";
import { useErrorDispatch } from "../../context/error.context";
import { getFirstApiErrorMessage } from "../../errors/apiErrorCatalogue";
import { useCommunityActions, usePlantActions } from "../../hooks/actions";
import { useActiveCommunityResource } from "../../hooks/useActiveCommunityResource";
import { communityLabel, useActiveCommunityName } from "../../hooks/useActiveCommunityName";
import { usePlantInActiveCommunity } from "./usePlantInActiveCommunity";

/** Which plant form the list opened: a new plant, or an existing one by id. */
export type PlantFormTarget = { kind: "create" } | { kind: "edit"; plantId: string };

interface PlantFormDialogProps {
  target: PlantFormTarget;
  onClose: () => void;
}

/**
 * Creates or edits a plant in the shared overlay, over the plant list or the
 * plant's detail (UI-PLT-014). Mounted
 * on open, so every opening starts from its own values.
 */
export const PlantFormDialog: FC<PlantFormDialogProps> = ({ target, onClose }) =>
  target.kind === "create" ? (
    <PlantCreateForm onClose={onClose} />
  ) : (
    <PlantEditForm plantId={target.plantId} onClose={onClose} />
  );

type SaveOutcome = { ok: true } | { error: unknown };

/** What the form sends, from what it holds. An empty optional input is sent as no value. */
const bodyOf = (values: PlantFieldValues, supplyCode: string): CreatePlantBody & UpdatePlantBody => ({
  providerCode: values.providerCode,
  regulatoryCode: values.regulatoryCode || undefined,
  name: values.name,
  address: values.address,
  description: values.description || undefined,
  totalPower: Number(values.totalPower),
  connectionDate: values.connectionDate ? values.connectionDate.toISOString() : undefined,
  supplyCode,
  inverterProvider: "HUAWEI",
});

/** The active community's supplies, as the selector offers them. */
function useCommunitySupplies() {
  const activeCommunityId = useActiveCommunity();
  const { data, isLoading } = useGetAllSupplies(
    activeCommunityId ?? "",
    { size: 10000 },
    { query: { enabled: !!activeCommunityId } },
  );
  return { supplies: data?.items ?? [], suppliesLoading: isLoading };
}

const PlantCreateForm: FC<{ onClose: () => void }> = ({ onClose }) => {
  const communityName = useActiveCommunityName();
  const activeCommunity = useActiveCommunityResource();
  // The community answers "may this person create plants at all", which gates
  // the list's create buttons too; the selector is bounded to the supplies
  // whose own canCreatePlant is true, so the form cannot offer a choice the
  // backend would refuse.
  const { createPlant } = useCommunityActions().forCommunity(activeCommunity).actions;
  const { supplies, suppliesLoading } = useCommunitySupplies();
  const selectable = supplies.filter((supply) => supply.capabilities.canCreatePlant);

  return (
    <PlantFormOverlay
      title={`Crear planta en ${communityLabel(communityName)}`}
      scopeHeader={<CommunityScopeHeader name={communityName} />}
      supplies={selectable}
      suppliesLoading={suppliesLoading}
      seeded={EMPTY_PLANT_FIELD_VALUES}
      submitLabel="Crear planta"
      pendingLabel="Creando..."
      save={createPlant && ((body) => createPlant.run(body))}
      generic="Ha habido un problema al crear una nueva planta. Por favor, inténtalo más tarde"
      onClose={onClose}
    />
  );
};

const PlantEditForm: FC<{ plantId: string; onClose: () => void }> = ({ plantId, onClose }) => {
  const { plant, isNotFound, error, refetch } = usePlantInActiveCommunity(plantId);
  const { edit } = usePlantActions().forPlant(plant).actions;
  // Every supply: the plant keeps its own, which the caller need not be allowed
  // to start another plant on, and the selector is disabled.
  const { supplies, suppliesLoading } = useCommunitySupplies();
  // Seeded once, from the first read: a refetch while the form is open (focus,
  // an invalidation) must not overwrite what is being typed (#373).
  const [seeded, setSeeded] = useState<PlantFieldValues>();
  if (!seeded && plant) setSeeded(plantFieldValuesOf(plant));

  // The same answers the plant detail page gives for a plant it cannot show.
  const status = isNotFound ? (
    <EmptyState
      icon={SearchOffIcon}
      title="Planta no encontrada"
      subtitle="Esta planta no existe o no tienes acceso a su comunidad."
    />
  ) : error ? (
    <LoadErrorAlert
      message="Ha habido un problema al cargar la información de esta planta. Por favor, inténtalo más tarde"
      onRetry={() => void refetch()}
    />
  ) : (
    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
      <CircularProgress aria-label="Cargando..." />
    </Box>
  );

  return (
    <PlantFormOverlay
      title="Editar planta"
      lead={plant && <Typography color="text.secondary">{plant.name}</Typography>}
      supplies={supplies}
      suppliesLoading={suppliesLoading}
      disableSupplySelector
      seeded={seeded}
      status={status}
      // Editing is not creating, whatever the plant is called.
      submitLabel="Guardar"
      pendingLabel="Guardando..."
      save={edit && ((body) => edit.run(body))}
      generic="Ha habido un problema al editar la planta. Por favor, inténtalo más tarde"
      onClose={onClose}
    />
  );
};

interface PlantFormOverlayProps {
  title: string;
  scopeHeader?: ReactNode;
  /** Shown above the fields. */
  lead?: ReactNode;
  supplies: SupplyResponse[];
  suppliesLoading: boolean;
  disableSupplySelector?: boolean;
  /** The values the form opened with; until there are some, `status` shows instead. */
  seeded: PlantFieldValues | undefined;
  status?: ReactNode;
  submitLabel: string;
  pendingLabel: string;
  /** Absent when the caller may not save. */
  save: ((body: CreatePlantBody & UpdatePlantBody) => Promise<SaveOutcome>) | undefined;
  /** What a refusal without an error detail says. */
  generic: string;
  onClose: () => void;
}

const sameValue = <K extends keyof PlantFieldValues>(field: K, a: PlantFieldValues[K], b: PlantFieldValues[K]) =>
  field === "connectionDate"
    ? (a as PlantFieldValues["connectionDate"])?.isSame(b as PlantFieldValues["connectionDate"], "day") ??
      b === null
    : a === b;

const PlantFormOverlay: FC<PlantFormOverlayProps> = ({
  title,
  scopeHeader,
  lead,
  supplies,
  suppliesLoading,
  disableSupplySelector = false,
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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<PlantFormField, string>>>({});
  // The ref answers a second submit before the first has re-rendered; the
  // state locks the overlay and the inputs (UI-OVL-002).
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const inputRefs: Record<PlantFormField, RefObject<HTMLInputElement | null>> = {
    providerCode: useRef(null),
    name: useRef(null),
    supplyCode: useRef(null),
    address: useRef(null),
    totalPower: useRef(null),
  };

  const selectedSupply = selectedSupplyOf(supplies, values?.supplyCode ?? null);
  const dirty =
    !!values &&
    !!seeded &&
    (Object.keys(seeded) as (keyof PlantFieldValues)[]).some((field) => !sameValue(field, values[field], seeded[field]));

  const onChange = <K extends keyof PlantFieldValues>(field: K, value: PlantFieldValues[K]) => {
    // Editing an input clears what was said about it; the power is checked as it is typed.
    if (field === "totalPower") {
      const input = value as string;
      setFieldErrors((errors) => ({
        ...errors,
        totalPower: input && !totalPowerIsValid(input) ? TOTAL_POWER_ERROR : undefined,
      }));
    } else if (field in inputRefs) {
      setFieldErrors((errors) => ({ ...errors, [field]: undefined }));
    }
    setValues((current) => current && { ...current, [field]: value });
  };

  const handleSubmit = async (event: FormEvent<HTMLElement>) => {
    event.preventDefault();
    if (!values || !save || savingRef.current) return;
    // Nothing is sent while an input is wrong: each says why, and the first
    // takes focus, rather than the submit being dropped without a word.
    const errors = plantFieldErrors(values, selectedSupply);
    if (errors.length > 0 || !selectedSupply) {
      setFieldErrors(Object.fromEntries(errors));
      inputRefs[errors[0][0]].current?.focus();
      return;
    }
    savingRef.current = true;
    setSaving(true);
    const outcome = await save(bodyOf(values, selectedSupply.code));
    savingRef.current = false;
    setSaving(false);
    if ("ok" in outcome) {
      onClose();
      return;
    }
    // The form stays as it was typed. The refusal is worded by its code
    // (UI-ERR-001, UI-ERR-005); without one, the generic text.
    errorDispatch(getFirstApiErrorMessage(outcome.error, generic));
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
        <PlantFormFields
          values={values}
          onChange={onChange}
          supplies={supplies}
          selectedSupply={selectedSupply}
          suppliesLoading={suppliesLoading}
          disableSupplySelector={disableSupplySelector}
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
