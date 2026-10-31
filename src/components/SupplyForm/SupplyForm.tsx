import { useState, useEffect, type FC } from "react";
import { Box, Button, TextField, Autocomplete, CircularProgress } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { sxStyles } from "../../theme/sx";
import { fontSizes, interactiveTransition, motion} from "../../theme/tokens";
import { useGetAllUsers } from "../../api/users/users";
import type { UserResponse } from "../../api/models";

export interface SupplyFormValues {
  name?: string;
  cups?: string;
  address?: string;
  addressRef?: string;
  personalId?: string;
}

/** The inputs an API refusal can be shown on. */
export type SupplyFormField = "cups" | "personalId";

interface SupplyFormProps {
  initialValues?: SupplyFormValues;
  handleSubmit: (values: SupplyFormValues) => void;
  /** A refusal shown on the input it is about, until that input is edited. */
  fieldErrors?: Partial<Record<SupplyFormField, string>>;
  /** Called when an input with an error is edited, so the page can clear it. */
  onFieldEdit?: (field: SupplyFormField) => void;
  showUserSelector?: boolean;
  selectedUserId?: string;
  disableUserSelector?: boolean;
  disabled?: boolean;
}

export const SupplyForm: FC<SupplyFormProps> = ({
  initialValues: {
    name: initialName = "",
    cups: initialCups = "",
    address: initialAddress = "",
    addressRef: initialAddressRef = "",
    personalId: initialPersonalId = "",
  } = {},
  handleSubmit,
  fieldErrors = {},
  onFieldEdit,
  showUserSelector = false,
  selectedUserId,
  disableUserSelector = false,
  disabled = false,
}) => {
  const [name, setName] = useState(initialName);
  const [cups, setCups] = useState(initialCups);
  const [address, setAddress] = useState(initialAddress);
  const [addressRef, setAddressRef] = useState(initialAddressRef);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);

  const { data: usersData, isLoading: usersLoading } = useGetAllUsers({ size: 10000 });

  useEffect(() => {
    if (selectedUserId && usersData?.items) {
      const user = usersData.items.find((u) => u.id === selectedUserId);
      if (user) {
        setSelectedUser(user);
      }
    }
  }, [selectedUserId, usersData]);

  const onSubmit = async (data: FormData) => {
    const newSupplyPoint = {
      name: data.get("name") ? (data.get("name") as string) : null,
      cups: data.get("cups") as string,
      address: data.get("address") as string,
      addressRef: data.get("addressRef") as string,
      personalId: selectedUser?.personalId || initialPersonalId,
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

        {showUserSelector && (
          <Autocomplete
            options={usersData?.items || []}
            getOptionLabel={(option) => `${option.fullName} (${option.personalId})`}
            value={selectedUser}
            onChange={(_, newValue) => {
              setSelectedUser(newValue);
              onFieldEdit?.("personalId");
            }}
            loading={usersLoading}
            disabled={disableUserSelector}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Propietario"
                required
                variant="outlined"
                error={!!fieldErrors.personalId}
                helperText={fieldErrors.personalId}
                slotProps={{
                  input: {
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {usersLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  },
                }}
              />
            )}
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
          disabled={disabled}
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
