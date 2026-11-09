import { useState, type FC } from "react";
import { Box, Button } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { sxStyles } from "../../theme/sx";
import { fontSizes, interactiveTransition, motion} from "../../theme/tokens";
import { SupplyFormFields } from "./SupplyFormFields";
import {
  isOwnerUnavailable,
  selectedOwnerOf,
  type SupplyFieldValues,
  type SupplyFormField,
  type SupplyOwnerField,
} from "./supplyFields";

export type { SupplyFormField, SupplyOwnerField } from "./supplyFields";

export interface SupplyFormValues {
  name?: string;
  cups?: string;
  address?: string;
  addressRef?: string;
  personalId?: string;
}

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
  const [values, setValues] = useState<SupplyFieldValues>({
    name: initialName,
    cups: initialCups,
    address: initialAddress,
    addressRef: initialAddressRef,
    ownerId: null,
  });
  const selectedOwner = selectedOwnerOf(owner, values.ownerId);

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
        <SupplyFormFields
          values={values}
          onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
          fieldErrors={fieldErrors}
          onFieldEdit={onFieldEdit}
          owner={owner}
        />

        <Button
          type="submit"
          variant="contained"
          disabled={disabled || isOwnerUnavailable(owner)}
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
