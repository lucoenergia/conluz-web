import { useState, type FC } from "react";
import { Box, Button, FormGroup, InputLabel, TextField } from "@mui/material";
import type { CreateSupplyBody } from "../../api/models";

interface FormValues {
  name?: string,
  cups?: string,
  address?: string,
  partitionCoefficient?: string,
  cadastralReference?: string
}

interface SupplyFormProps {
  initialValues?: FormValues,
  handleSubmit: (values: CreateSupplyBody) => void
}


export const SupplyForm: FC<SupplyFormProps> = ({ initialValues: {  name: initialName='', cups: initialCups='', address: initialAddress='', partitionCoefficient: initialPartitionCoefficient='', cadastralReference: initialCadastralReference='' } = {}, handleSubmit }) => {
  const [name, setName] = useState(initialName);
  const [cups, setCups] = useState(initialCups);
  const [address, setAddress] = useState(initialAddress);
  const [partitionCoefficient, setPartitionCoefficient] = useState(initialPartitionCoefficient);
  const [cadastralReference, setCadastralReference] = useState(initialCadastralReference);

  const [partitionCoefficientError, setPartitionCoefficientError] = useState<string | undefined>()

  const partitionCoefficientIsValid = (input: string): boolean => {
    return input.match(/^\d[,|\.]\d{6}$/) !== null;
  }
  
  const onPartitionCoeficientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(!partitionCoefficientIsValid(e.target.value.toString())) {
      setPartitionCoefficientError("Por favor, introduce un numero de 6 decimales");
    } else {
      setPartitionCoefficientError(undefined);
    }
    setPartitionCoefficient(e.target.value);
  }

  const validateForm = (data: CreateSupplyBody): boolean => {
    return partitionCoefficientIsValid(data.partitionCoefficient.toString())
  }
  
  const onSubmit = async (data: FormData) => {
    const newSupplyPoint = {
      name: data.get('name') as string,
      code: data.get('cups') as string,
      address: data.get('address') as string,
      partitionCoefficient: Number((data.get('partitionCoefficient') as string).replaceAll(',','.')),
      personalId: '01234567Z' // TODO: correct this mapping once we have the endpoint to get logged user data
      // TODO: endpoint not accepting cadastralReference. Once its update it must be included
    } as CreateSupplyBody
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
            required
            fullWidth
            variant="filled"
          />
        </FormGroup>
        <FormGroup>
          <InputLabel htmlFor="cups">CUPS</InputLabel>
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
          <InputLabel htmlFor="address">Dirección</InputLabel>
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
          <InputLabel htmlFor="partitionCoefficient">Coeficiente de reparto (%)</InputLabel>
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
          <InputLabel htmlFor="cadastralReference">Referencia catastral</InputLabel>
          <TextField
            id="cadastralReference"
            type="text"
            name="cadastralReference"
            value={cadastralReference}
            onChange={(e) => setCadastralReference(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 50 }}}
            autoFocus
            required
            fullWidth
            variant="filled"
          />
        </FormGroup>
        <Button type="submit" variant="contained" className="w-fit justify-self-center">
          Crear punto de suministro
        </Button>
      </Box>
  )
}
