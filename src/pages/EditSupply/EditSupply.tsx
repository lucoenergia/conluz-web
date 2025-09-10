import { useState, type FC } from "react";
import { Alert, Box, Slide, Snackbar, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router";
import type { UpdateSupplyBody } from "../../api/models";
import { BreadCrumb } from "../../components/breadCrumb/BreadCrumb";
import { SupplyForm, type SupplyFormValues } from "../../components/supplyForm/SupplyForm";
import { updateSupply, useGetSupply } from "../../api/supplies/supplies";

export const EditSupplyPage: FC = () => {
  const { supplyPointId = '' } = useParams();
  const [submitError, setSubmitError] = useState(false);
  const navigate = useNavigate();

  const { data: supplyPoint, isLoading, error } = useGetSupply(supplyPointId);

  const handleSubmit = async ({ name, cups, address, partitionCoefficient }: SupplyFormValues) => {
    try {
      const updatedSupply = {
        name,
        code: cups,
        address,
        partitionCoefficient
        // TODO: endpoint not accepting cadastralReference. Once its update it must be included
      } as UpdateSupplyBody;
      const response = await updateSupply(supplyPointId, updatedSupply);
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
      <BreadCrumb steps={[{ label: 'Consumo', href: '/supply-points' }, { label: supplyPoint?.code ? supplyPoint.code : supplyPointId, href: `/supply-points/${supplyPointId}` }, { label: 'Editar', href: "#" }]} />
      <Typography variant="h1" className="text-3xl">Editar punto de suministro: {supplyPoint?.name}</Typography>
      {!isLoading && !error &&
        <SupplyForm initialValues={{ name: supplyPoint?.name, cups: supplyPoint?.code, address: supplyPoint?.address, partitionCoefficient: supplyPoint?.partitionCoefficient }} handleSubmit={handleSubmit} />
      }
      <Snackbar open={submitError} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} slots={{ transition: Slide }}>
        <Alert severity="error">Hay habido un problema al crear un nuevo punto de suministro. Por favor, inténtalo más tarde</Alert>
      </Snackbar>
    </Box>
  )
}
