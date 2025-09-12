import { type FC } from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router";
import type { UpdateSupplyBody } from "../../api/models";
import { BreadCrumb } from "../../components/breadCrumb/BreadCrumb";
import { SupplyForm, type SupplyFormValues } from "../../components/supplyForm/SupplyForm";
import { useGetSupply, useUpdateSupply } from "../../api/supplies/supplies";
import { useErrorDispatch } from "../../context/error.context";

export const EditSupplyPage: FC = () => {
  const { supplyPointId = '' } = useParams();
  const errorDispatch = useErrorDispatch();
  const navigate = useNavigate();
  const updateSupplyMutation = useUpdateSupply();

  const { data: supplyPoint, isLoading, error, refetch } = useGetSupply(supplyPointId);

  const handleSubmit = async ({ name, cups, address, partitionCoefficient, addressRef }: SupplyFormValues) => {
    try {
      const updatedSupply = {
        name,
        code: cups,
        address,
        partitionCoefficient,
        addressRef
      } as UpdateSupplyBody;
      const response = await updateSupplyMutation.mutateAsync({ id: supplyPointId, data: updatedSupply}, { });
      if (response) {
        refetch();
        navigate('/supply-points');
      } else {
        errorDispatch("Hay habido un problema al editar el punto de suministro. Por favor, inténtalo más tarde")
      }
    } catch (e) {
        errorDispatch("Hay habido un problema al editar el punto de suministro. Por favor, inténtalo más tarde")
    }
  }
  return (
    <Box className="grid gap-4">
      <BreadCrumb steps={[{ label: 'Consumo', href: '/supply-points' }, { label: supplyPoint?.code ? supplyPoint.code : supplyPointId, href: `/supply-points/${supplyPointId}` }, { label: 'Editar', href: "#" }]} />
      <Typography variant="h1" className="text-3xl">Editar punto de suministro: {supplyPoint?.name}</Typography>
      {!isLoading && !error &&
        <SupplyForm initialValues={{ name: supplyPoint?.name, cups: supplyPoint?.code, address: supplyPoint?.address, partitionCoefficient: supplyPoint?.partitionCoefficient, addressRef: supplyPoint?.addressRef }} handleSubmit={handleSubmit} />
      }
    </Box>
  )
}
