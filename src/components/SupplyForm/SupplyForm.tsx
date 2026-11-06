import { useState, type FC } from "react";
import { Box, Button, TextField, Autocomplete, CircularProgress } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { sxStyles } from "../../theme/sx";
import { fontSizes, interactiveTransition, motion} from "../../theme/tokens";
import type { MembershipResponse } from "../../api/models";

export interface SupplyFormValues {
  name?: string;
  cups?: string;
  address?: string;
  addressRef?: string;
  personalId?: string;
}

/**
 * The owner input, as the page supplies it. The form fetches nothing itself:
 * the create page chooses among the active community's memberships, and the
 * edit page only shows the owner the supply already has (UI-SUP-016, UI-SUP-018).
 */
export type SupplyOwnerField =
  | { mode: "choose"; status: "loading" | "ready" | "error"; options: MembershipResponse[] }
  | { mode: "show"; fullName: string | null };

/** The inputs an API refusal can be shown on. */
export type SupplyFormField = "cups" | "personalId";

interface SupplyFormProps {
  initialValues?: SupplyFormValues;
  handleSubmit: (values: SupplyFormValues) => void;
  /** A refusal shown on the input it is about, until that input is edited. */
  fieldErrors?: Partial<Record<SupplyFormField, string>>;
  /** Called when an input with an error is edited, so the page can clear it. */
  onFieldEdit?: (field: SupplyFormField) => void;
  owner?: SupplyOwnerField;
  disabled?: boolean;
}

export const SupplyForm: FC<SupplyFormProps> = ({
  initialValues: {
    name: initialName = "",
    cups: initialCups = "",
    address: initialAddress = "",
    addressRef: initialAddressRef = "",
  } = {},
  handleSubmit,
  fieldErrors = {},
  onFieldEdit,
  owner,
  disabled = false,
}) => {
  const [name, setName] = useState(initialName);
  const [cups, setCups] = useState(initialCups);
  const [address, setAddress] = useState(initialAddress);
  const [addressRef, setAddressRef] = useState(initialAddressRef);
  // The membership's id, resolved against the options on every render: a list
  // for another community does not hold it, so the selection clears itself.
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);

  const ownerOptions = owner?.mode === "choose" ? owner.options : [];
  const selectedOwner = ownerOptions.find((m) => m.id === selectedOwnerId) ?? null;
  const ownerLoading = owner?.mode === "choose" && owner.status === "loading";
  // A community with no members, or whose members could not be read, has no
  // owner to offer, so the form cannot be sent (UI-SUP-017).
  const ownerUnavailable =
    owner?.mode === "choose" && (owner.status !== "ready" || owner.options.length === 0);
  const ownerNotice =
    owner?.mode !== "choose"
      ? undefined
      : owner.status === "error"
        ? "No se pudieron cargar los miembros de esta comunidad. Inténtalo más tarde."
        : owner.status === "ready" && owner.options.length === 0
          ? "Esta comunidad todavía no tiene miembros. Añádelos antes de crear un punto de suministro."
          : undefined;

  const onSubmit = async (data: FormData) => {
    const newSupplyPoint = {
      name: data.get("name") ? (data.get("name") as string) : null,
      cups: data.get("cups") as string,
      address: data.get("address") as string,
      addressRef: data.get("addressRef") as string,
      personalId: selectedOwner?.personalId,
    } as SupplyFormValues;
    handleSubmit(newSupplyPoint);
  };

  return (
    <Box component="form" action={onSubmit}>
      <Box sx={sxStyles.flexColumnGap3}>
        <TextField
          id="name"
          label="Nombre"
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 50 } }}
          autoFocus
          fullWidth
          variant="outlined"
        />

        {owner?.mode === "choose" && (
          <Autocomplete
            options={ownerOptions}
            getOptionLabel={(option) => `${option.fullName} (${option.personalId})`}
            // Two members may share a label; the membership is what identifies them.
            getOptionKey={(option) => option.id}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={selectedOwner}
            onChange={(_, newValue) => {
              setSelectedOwnerId(newValue?.id ?? null);
              onFieldEdit?.("personalId");
            }}
            loading={ownerLoading}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Propietario"
                required
                variant="outlined"
                error={!!fieldErrors.personalId || owner.status === "error"}
                helperText={fieldErrors.personalId ?? ownerNotice}
                slotProps={{
                  input: {
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {ownerLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  },
                }}
              />
            )}
          />
        )}

        {owner?.mode === "show" && (
          // The owner of an existing supply cannot be changed here; it is the
          // supply's member record in its community (UI-SUP-005).
          <TextField
            id="owner"
            label="Propietario"
            type="text"
            value={owner.fullName || "-"}
            slotProps={{ htmlInput: { readOnly: true } }}
            fullWidth
            variant="outlined"
          />
        )}

        <TextField
          id="cups"
          label="CUPS"
          type="text"
          name="cups"
          value={cups}
          onChange={(e) => {
            setCups(e.target.value);
            onFieldEdit?.("cups");
          }}
          slotProps={{ htmlInput: { maxLength: 50 } }}
          error={!!fieldErrors.cups}
          helperText={fieldErrors.cups}
          required
          fullWidth
          variant="outlined"
        />

        <TextField
          id="address"
          label="Dirección"
          type="text"
          name="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 50 } }}
          required
          fullWidth
          variant="outlined"
        />

        <TextField
          id="addressRef"
          label="Referencia catastral"
          type="text"
          name="addressRef"
          value={addressRef}
          onChange={(e) => setAddressRef(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 50 } }}
          fullWidth
          variant="outlined"
        />

        <Button
          type="submit"
          variant="contained"
          disabled={disabled || ownerUnavailable}
          sx={(theme) => ({
            px: 3,
            py: 1.5,
            fontSize: fontSizes.xl,
            boxShadow: `0 4px 15px 0 ${alpha(theme.palette.primary.main, 0.4)}`,
            "&:hover": {
              transform: `translateY(${motion.lift})`,
              boxShadow: `0 6px 20px 0 ${alpha(theme.palette.primary.main, 0.5)}`,
            },
            transition: interactiveTransition("0.3s", "ease"),
          })}
        >
          {initialName ? "Guardar cambios" : "Crear punto de suministro"}
        </Button>
      </Box>
    </Box>
  );
};
