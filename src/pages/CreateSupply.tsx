import { useState, type FC } from "react";
import { BreadCrumb } from "../components/breadCrumb/BreadCrumb";
import { Alert, Box, Slide, Snackbar, Typography } from "@mui/material";
import { createSupply } from "../api/supplies/supplies";
import type { CreateSupplyBody } from "../api/models";
import { useNavigate } from "react-router";
import { SupplyForm, type SupplyFormValues } from "../components/supplyForm/SupplyForm";
import { useLoggedUser } from "../api/logged-user.context";

export const CreateSupplyPage: FC = () => {
  const [submitError, setSubmitError] = useState(false);
  const navigate = useNavigate();
  const loggedUser = useLoggedUser();

  const handleSubmit = async ({ name, cups, address, partitionCoefficient }: SupplyFormValues) => {
    try {
      const newSupply = {
        name,
        code: cups,
        address,
        partitionCoefficient,
        personalId: loggedUser?.personalId
        // TODO: endpoint not accepting cadastralReference. Once its update it must be included
      } as CreateSupplyBody
      const response = await createSupply(newSupply);
      if (response) {
        navigate('/supply-points');
      } else {
        setSubmitError(true)
      }
    } catch (e) {
      setSubmitError(true);
    }
  }

  return (
    <Box className="grid gap-4">
      <BreadCrumb steps={[{ label: 'Consumo', href: '/supply-points' }, { label: 'Nuevo', href: '#' }]} />
      <Typography variant="h1" className="text-3xl">Crear nuevo punto de suministro</Typography>
      <SupplyForm handleSubmit={handleSubmit} />
      <Snackbar open={submitError} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} slots={{ transition: Slide }}>
        <Alert severity="error">Hay habido un problema al crear un nuevo punto de suministro. Por favor, inténtalo más tarde</Alert>
      </Snackbar>
    </Box>
  )
}
