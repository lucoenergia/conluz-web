import { type FC } from "react";
import { BreadCrumb } from "../components/breadCrumb/BreadCrumb";
import { Box, Typography } from "@mui/material";
import { createSupply } from "../api/supplies/supplies";
import type { CreateSupplyBody } from "../api/models";
import { useNavigate } from "react-router";
import { SupplyForm } from "../components/supplyForm/SupplyForm";

export const CreateSupplyPage: FC = () => {
  const navigate = useNavigate();

  const handleSubmit = async (data: CreateSupplyBody) => {
    const response = await createSupply(data);
    if (response) {
      navigate('/supply-points');
    }
  }
  
  return (
    <Box className="grid gap-4">
      <BreadCrumb steps={[{ label: 'Consumo', href: '/supply-points' }, { label: 'Nuevo', href: '#' }]} />
      <Typography variant="h1" className="text-3xl">Crear nuevo punto de suministro</Typography>
      <SupplyForm handleSubmit={handleSubmit}/>
    </Box>
  )
}
