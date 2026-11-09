import { useState, type FC } from "react";
import { Box, Button } from "@mui/material";
import { sxStyles } from "../../theme/sx";
import { fontSizes, interactiveTransition, motion} from "../../theme/tokens";
import { alpha } from "@mui/material/styles";
import { useGetAllSupplies } from "../../api/supplies/supplies";
import { useActiveCommunity } from "../../context/community.context";
import { PlantFormFields } from "./PlantFormFields";
import { selectedSupplyOf, TOTAL_POWER_ERROR, totalPowerIsValid, type PlantFieldValues } from "./plantFields";
import dayjs from "dayjs";

export interface PlantFormValues {
  providerCode: string;
  regulatoryCode?: string;
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
  /**
   * Blocks the submit. The route guard is the first line; this is the second,
   * covering the render before the plant or the community has arrived.
   */
  disabled?: boolean;
}

export const PlantForm: FC<PlantFormProps> = ({
  initialValues: {
    providerCode: initialProviderCode = "",
    regulatoryCode: initialRegulatoryCode = "",
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
  disabled = false,
}) => {
  const [values, setValues] = useState<PlantFieldValues>(() => ({
    providerCode: initialProviderCode,
    regulatoryCode: initialRegulatoryCode,
    name: initialName,
    address: initialAddress,
    description: initialDescription,
    totalPower: String(initialTotalPower),
    connectionDate: initialConnectionDate ? dayjs(initialConnectionDate) : null,
    supplyCode: selectedSupplyCode || initialSupplyCode || null,
  }));

  // Fetch supplies for the selector
  const activeCommunityId = useActiveCommunity();
  const { data: suppliesData, isLoading: suppliesLoading } = useGetAllSupplies(
    activeCommunityId ?? "",
    { size: 10000 },
    { query: { enabled: !!activeCommunityId } },
  );

  // Only the supplies this caller may build a plant on. The community's
  // canCreatePlants answers "may this person create plants at all" and gates the
  // entry point; the supply's own canCreatePlant answers "on this one", and its
  // doc is explicit that the community flag is not sufficient for any particular
  // supply. Filtering here is what keeps the form from offering a choice the
  // backend would refuse. Editing passes disableSupplySelector, so the plant's
  // existing supply is never filtered out from under it.
  const selectableSupplies = disableSupplySelector
    ? (suppliesData?.items ?? [])
    : (suppliesData?.items ?? []).filter((supply) => supply.capabilities.canCreatePlant);

  // Resolved against every supply, as the selection always was: a plant's own
  // supply is shown even where the caller may not start a plant on it.
  const selectedSupply = selectedSupplyOf(suppliesData?.items ?? [], values.supplyCode);

  const [totalPowerError, setTotalPowerError] = useState<string | undefined>();

  const onChange = <K extends keyof PlantFieldValues>(field: K, value: PlantFieldValues[K]) => {
    if (field === "totalPower") {
      const input = value as string;
      setTotalPowerError(input && !totalPowerIsValid(input) ? TOTAL_POWER_ERROR : undefined);
    }
    setValues((current) => ({ ...current, [field]: value }));
  };

  const validateForm = (data: PlantFormValues): boolean => {
    if (!data.providerCode || !data.name || !data.address || !data.supplyCode) {
      return false;
    }
    if (!totalPowerIsValid(data.totalPower.toString())) {
      return false;
    }
    return true;
  };

  const onSubmit = async () => {
    const newPlant = {
      providerCode: values.providerCode,
      regulatoryCode: values.regulatoryCode || undefined,
      name: values.name,
      address: values.address,
      description: values.description,
      totalPower: Number(values.totalPower),
      connectionDate: values.connectionDate ? values.connectionDate.toISOString() : undefined,
      supplyCode: selectedSupply?.code || "",
      inverterProvider: "HUAWEI" as const,
    } as PlantFormValues;

    if (validateForm(newPlant)) {
      handleSubmit(newPlant);
    }
  };

  return (
    <Box component="form" action={onSubmit}>
      <Box sx={sxStyles.flexColumnGap3}>
        <PlantFormFields
          values={values}
          onChange={onChange}
          supplies={selectableSupplies}
          selectedSupply={selectedSupply}
          suppliesLoading={suppliesLoading}
          disableSupplySelector={disableSupplySelector}
          fieldErrors={{ totalPower: totalPowerError }}
        />

        <Button
          type="submit"
          variant="contained"
          disabled={disabled}
          sx={(theme) => ({
            background: theme.palette.primary.main,
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
          {initialName ? "Guardar cambios" : "Crear planta"}
        </Button>
      </Box>
    </Box>
  );
};
