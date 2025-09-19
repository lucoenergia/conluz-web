import { useState, type FC } from "react";
import { Box, Button, FormGroup, InputLabel, TextField } from "@mui/material";

export interface SupplyFormValues {
  name?: string,
  cups?: string,
  address?: string,
  partitionCoefficient?: number,
  addressRef?: string
}

interface SupplyFormProps {
  initialValues?: SupplyFormValues,
  handleSubmit: (values: SupplyFormValues) => void
}


export const SupplyForm: FC<SupplyFormProps> = ({ initialValues: {  name: initialName='', cups: initialCups='', address: initialAddress='', partitionCoefficient: initialPartitionCoefficient='', addressRef: initialAddressRef='' } = {}, handleSubmit }) => {
  const [name, setName] = useState(initialName);
  const [cups, setCups] = useState(initialCups);
  const [address, setAddress] = useState(initialAddress);
  const [partitionCoefficient, setPartitionCoefficient] = useState(initialPartitionCoefficient);
  const [addressRef, setAddressRef] = useState(initialAddressRef);

  const [partitionCoefficientError, setPartitionCoefficientError] = useState<string | undefined>()

  const partitionCoefficientIsValid = (input: string): boolean => {
    return input.match(/^\d{1,3}[,|\.]\d{6}$/) !== null;
  }
  
  const onPartitionCoeficientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(!partitionCoefficientIsValid(e.target.value.toString())) {
      setPartitionCoefficientError("Por favor, introduce un numero de 6 decimales");
    } else {
      setPartitionCoefficientError(undefined);
    }
    setPartitionCoefficient(e.target.value);
  }

  const validateForm = (data: SupplyFormValues): boolean => {
    return data.partitionCoefficient !== undefined && partitionCoefficientIsValid(data.partitionCoefficient.toString())
  }
  
  const onSubmit = async (data: FormData) => {
    const newSupplyPoint = {
      name: data.get('name') ? data.get('name') as string : null,
      cups: data.get('cups') as string,
      address: data.get('address') as string,
      partitionCoefficient: Number((data.get('partitionCoefficient') as string).replaceAll(',','.')),
      addressRef: data.get('addressRef') as string
    } as SupplyFormValues
    if (validateForm(newSupplyPoint)) {
      handleSubmit(newSupplyPoint);
    }
  }
  
  return (
      <Box component="form" action={onSubmit} className="md:max-w-100 grid gap-4">
        <FormGroup>
          <InputLabel htmlFor="name">Nombre</InputLabel>
          <TextField
            id="name"
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 50 }}}
            autoFocus
            fullWidth
            variant="filled"
          />
        </FormGroup>
        <FormGroup>
          <InputLabel htmlFor="cups">CUPS<span className="text-red-600">*</span></InputLabel>
          <TextField
            id="cups"
            type="text"
            name="cups"
            value={cups}
            onChange={(e) => setCups(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 50 }}}
            autoFocus
            required
            fullWidth
            variant="filled"
          />
        </FormGroup>
        <FormGroup>
          <InputLabel htmlFor="address">Dirección<span className="text-red-600">*</span></InputLabel>
          <TextField
            id="address"
            type="text"
            name="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 50 }}}
            autoFocus
            required
            fullWidth
            variant="filled"
          />
        </FormGroup>
        <FormGroup>
          <InputLabel htmlFor="partitionCoefficient">Coeficiente de reparto (%)<span className="text-red-600">*</span></InputLabel>
          <TextField
            id="partitionCoefficient"
            type="text"
            error={partitionCoefficientError !== undefined}
            helperText={partitionCoefficientError}
            name="partitionCoefficient"
            value={partitionCoefficient}
            onChange={onPartitionCoeficientChange}
            autoFocus
            required
            fullWidth
            variant="filled"
          />
        </FormGroup>
        <FormGroup>
          <InputLabel htmlFor="addressRef">Referencia catastral<span className="text-red-600">*</span></InputLabel>
          <TextField
            id="addressRef"
            type="text"
            name="addressRef"
            value={addressRef}
            onChange={(e) => setAddressRef(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 50 }}}
            autoFocus
            required
            fullWidth
            variant="filled"
          />
        </FormGroup>
        <Button type="submit" variant="contained" className="w-fit justify-self-center">
          { initialName ? "Guardar cambios" : "Crear punto de suministro"}
        </Button>
      </Box>
  )
}
