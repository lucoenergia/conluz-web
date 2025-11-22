import { useState, useEffect, type FC } from "react";
import { Box, Button, TextField, Autocomplete, CircularProgress } from "@mui/material";
import { useGetAllSupplies } from "../../api/supplies/supplies";
import type { SupplyResponse } from "../../api/models";

export interface PlantFormValues {
  code: string;
  name: string;
  address: string;
  description?: string;
  totalPower: number;
  connectionDate?: string;
  supplyCode: string;
  inverterProvider?: "HUAWEI";
}

interface PlantFormProps {
  initialValues?: Partial<PlantFormValues>;
  handleSubmit: (values: PlantFormValues) => void;
  selectedSupplyCode?: string;
  disableSupplySelector?: boolean;
}

export const PlantForm: FC<PlantFormProps> = ({
  initialValues: {
    code: initialCode = "",
    name: initialName = "",
    address: initialAddress = "",
    description: initialDescription = "",
    totalPower: initialTotalPower = "",
    connectionDate: initialConnectionDate = "",
    supplyCode: initialSupplyCode = "",
  } = {},
  handleSubmit,
  selectedSupplyCode,
  disableSupplySelector = false,
}) => {
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState(initialName);
  const [address, setAddress] = useState(initialAddress);
  const [description, setDescription] = useState(initialDescription);
  const [totalPower, setTotalPower] = useState(initialTotalPower);
  const [connectionDate, setConnectionDate] = useState(initialConnectionDate);
  const [selectedSupply, setSelectedSupply] = useState<SupplyResponse | null>(null);

  // Fetch supplies for the selector
  const { data: suppliesData, isLoading: suppliesLoading } = useGetAllSupplies({ size: 10000 });

  // Set initial selected supply when editing
  useEffect(() => {
    const supplyCodeToUse = selectedSupplyCode || initialSupplyCode;
    if (supplyCodeToUse && suppliesData?.items) {
      const supply = suppliesData.items.find((s) => s.code === supplyCodeToUse);
      if (supply) {
        setSelectedSupply(supply);
      }
    }
  }, [selectedSupplyCode, initialSupplyCode, suppliesData]);

  const [totalPowerError, setTotalPowerError] = useState<string | undefined>();

  const totalPowerIsValid = (input: string): boolean => {
    const num = Number(input);
    return !isNaN(num) && num > 0;
  };

  const onTotalPowerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value && !totalPowerIsValid(value)) {
      setTotalPowerError("Por favor, introduce un número mayor que 0");
    } else {
      setTotalPowerError(undefined);
    }
    setTotalPower(value);
  };

  const validateForm = (data: PlantFormValues): boolean => {
    if (!data.code || !data.name || !data.address || !data.supplyCode) {
      return false;
    }
    if (!totalPowerIsValid(data.totalPower.toString())) {
      return false;
    }
    return true;
  };

  const onSubmit = async (data: FormData) => {
    const newPlant = {
      code: data.get("code") as string,
      name: data.get("name") as string,
      address: data.get("address") as string,
      description: data.get("description") as string,
      totalPower: Number(data.get("totalPower") as string),
      connectionDate: data.get("connectionDate") as string,
      supplyCode: selectedSupply?.code || "",
      inverterProvider: "HUAWEI" as const,
    } as PlantFormValues;

    if (validateForm(newPlant)) {
      handleSubmit(newPlant);
    }
  };

  return (
    <Box component="form" action={onSubmit}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <TextField
          id="code"
          label="Código"
          type="text"
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 50 } }}
          required
          autoFocus
          fullWidth
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              "&:hover fieldset": {
                borderColor: "#667eea",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#667eea",
              },
            },
            "& .MuiInputLabel-root.Mui-focused": {
              color: "#667eea",
            },
          }}
        />

        <TextField
          id="name"
          label="Nombre"
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 50 } }}
          required
          fullWidth
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              "&:hover fieldset": {
                borderColor: "#667eea",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#667eea",
              },
            },
            "& .MuiInputLabel-root.Mui-focused": {
              color: "#667eea",
            },
          }}
        />

        <Autocomplete
          options={suppliesData?.items || []}
          getOptionLabel={(option) => `${option.name || option.code} (${option.code})`}
          value={selectedSupply}
          onChange={(_, newValue) => setSelectedSupply(newValue)}
          loading={suppliesLoading}
          disabled={disableSupplySelector}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Punto de suministro"
              required
              variant="outlined"
              slotProps={{
                input: {
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {suppliesLoading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                },
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "&:hover fieldset": {
                    borderColor: disableSupplySelector ? undefined : "#667eea",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: disableSupplySelector ? undefined : "#667eea",
                  },
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: disableSupplySelector ? undefined : "#667eea",
                },
              }}
            />
          )}
        />

        <TextField
          id="address"
          label="Dirección"
          type="text"
          name="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 100 } }}
          required
          fullWidth
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              "&:hover fieldset": {
                borderColor: "#667eea",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#667eea",
              },
            },
            "& .MuiInputLabel-root.Mui-focused": {
              color: "#667eea",
            },
          }}
        />

        <TextField
          id="description"
          label="Descripción"
          type="text"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 250 } }}
          multiline
          rows={3}
          fullWidth
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              "&:hover fieldset": {
                borderColor: "#667eea",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#667eea",
              },
            },
            "& .MuiInputLabel-root.Mui-focused": {
              color: "#667eea",
            },
          }}
        />

        <TextField
          id="totalPower"
          label="Potencia total (kW)"
          type="number"
          error={totalPowerError !== undefined}
          helperText={totalPowerError}
          name="totalPower"
          value={totalPower}
          onChange={onTotalPowerChange}
          required
          fullWidth
          variant="outlined"
          slotProps={{
            htmlInput: {
              min: 0,
              step: 0.01,
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              "&:hover fieldset": {
                borderColor: "#667eea",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#667eea",
              },
            },
            "& .MuiInputLabel-root.Mui-focused": {
              color: "#667eea",
            },
          }}
        />

        <TextField
          id="connectionDate"
          label="Fecha de conexión"
          type="date"
          name="connectionDate"
          value={connectionDate}
          onChange={(e) => setConnectionDate(e.target.value)}
          fullWidth
          variant="outlined"
          slotProps={{
            inputLabel: {
              shrink: true,
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              "&:hover fieldset": {
                borderColor: "#667eea",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#667eea",
              },
            },
            "& .MuiInputLabel-root.Mui-focused": {
              color: "#667eea",
            },
          }}
        />

        <Button
          type="submit"
          variant="contained"
          sx={{
            background: "#667eea",
            textTransform: "none",
            px: 3,
            py: 1.5,
            fontSize: "1rem",
            boxShadow: "0 4px 15px 0 rgba(102,126,234,0.4)",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 6px 20px 0 rgba(102,126,234,0.5)",
            },
            transition: "all 0.3s ease",
          }}
        >
          {initialName ? "Guardar cambios" : "Crear planta"}
        </Button>
      </Box>
    </Box>
  );
};
