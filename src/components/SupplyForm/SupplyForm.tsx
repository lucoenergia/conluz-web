import { useState, useEffect, type FC } from "react";
import { Box, Button, TextField, Autocomplete, CircularProgress } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { sxStyles } from "../../theme/sx";
import { fontSizes } from "../../theme/tokens";
import { useGetAllUsers } from "../../api/users/users";
import type { UserResponse } from "../../api/models";

export interface SupplyFormValues {
  name?: string;
  cups?: string;
  address?: string;
  partitionCoefficient?: number;
  addressRef?: string;
  personalId?: string;
}

interface SupplyFormProps {
  initialValues?: SupplyFormValues;
  handleSubmit: (values: SupplyFormValues) => void;
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
    partitionCoefficient: initialPartitionCoefficient = "",
    addressRef: initialAddressRef = "",
    personalId: initialPersonalId = "",
  } = {},
  handleSubmit,
  showUserSelector = false,
  selectedUserId,
  disableUserSelector = false,
  disabled = false,
}) => {
  const [name, setName] = useState(initialName);
  const [cups, setCups] = useState(initialCups);
  const [address, setAddress] = useState(initialAddress);
  const [partitionCoefficient, setPartitionCoefficient] = useState(initialPartitionCoefficient);
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

  const [partitionCoefficientError, setPartitionCoefficientError] = useState<string | undefined>();

  const partitionCoefficientIsValid = (input: string): boolean => {
    return input.match(/^\d{1,3}[,.]\d{6}$/) !== null;
  };

  const onPartitionCoeficientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!partitionCoefficientIsValid(e.target.value.toString())) {
      setPartitionCoefficientError("Por favor, introduce un numero de 6 decimales");
    } else {
      setPartitionCoefficientError(undefined);
    }
    setPartitionCoefficient(e.target.value);
  };

  const validateForm = (data: SupplyFormValues): boolean => {
    return data.partitionCoefficient !== undefined && partitionCoefficientIsValid(data.partitionCoefficient.toString());
  };

  const onSubmit = async (data: FormData) => {
    const newSupplyPoint = {
      name: data.get("name") ? (data.get("name") as string) : null,
      cups: data.get("cups") as string,
      address: data.get("address") as string,
      partitionCoefficient: Number((data.get("partitionCoefficient") as string).replaceAll(",", ".")),
      addressRef: data.get("addressRef") as string,
      personalId: selectedUser?.personalId || initialPersonalId,
    } as SupplyFormValues;
    if (validateForm(newSupplyPoint)) {
      handleSubmit(newSupplyPoint);
    }
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
            onChange={(_, newValue) => setSelectedUser(newValue)}
            loading={usersLoading}
            disabled={disableUserSelector}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Propietario"
                required
                variant="outlined"
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
          onChange={(e) => setCups(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 50 } }}
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
          id="partitionCoefficient"
          label="Coeficiente de reparto (%)"
          type="text"
          error={partitionCoefficientError !== undefined}
          helperText={partitionCoefficientError}
          name="partitionCoefficient"
          value={partitionCoefficient}
          onChange={onPartitionCoeficientChange}
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
          required
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
              transform: "translateY(-2px)",
              boxShadow: `0 6px 20px 0 ${alpha(theme.palette.primary.main, 0.5)}`,
            },
            transition: "all 0.3s ease",
          })}
        >
          {initialName ? "Guardar cambios" : "Crear punto de suministro"}
        </Button>
      </Box>
    </Box>
  );
};
