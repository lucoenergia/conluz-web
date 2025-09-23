import { type FC } from "react";
import { BreadCrumb } from "../components/Breadcrumb/BreadCrumb";
import { Box, Typography } from "@mui/material";
import { useCreateSupply } from "../api/supplies/supplies";
import type { CreateSupplyBody } from "../api/models";
import { useNavigate } from "react-router";
import { SupplyForm, type SupplyFormValues } from "../components/SupplyForm/SupplyForm";
import { useLoggedUser } from "../context/logged-user.context";
import { useErrorDispatch } from "../context/error.context";

export const CreateSupplyPage: FC = () => {
  const navigate = useNavigate();
  const loggedUser = useLoggedUser();
  const errorDispatch = useErrorDispatch();
  const createSupply = useCreateSupply();

  const handleSubmit = async ({ name, cups, address, partitionCoefficient, addressRef }: SupplyFormValues) => {
    try {
      const newSupply = {
        name,
        code: cups,
        address,
        partitionCoefficient,
        personalId: loggedUser?.personalId,
        addressRef,
      } as CreateSupplyBody;
      const response = await createSupply.mutateAsync({ data: newSupply });
      if (response) {
        navigate("/supply-points");
      } else {
        errorDispatch("Hay habido un problema al crear un nuevo punto de suministro. Por favor, inténtalo más tarde");
      }
    } catch (e) {
      errorDispatch("Hay habido un problema al crear un nuevo punto de suministro. Por favor, inténtalo más tarde");
    }
  };

  return (
    <Box className="grid gap-4">
      <BreadCrumb
        steps={[
          { label: "Consumo", href: "/supply-points" },
          { label: "Nuevo", href: "#" },
        ]}
      />
      <Typography variant="h1" className="text-3xl">
        Crear nuevo punto de suministro
      </Typography>
      <SupplyForm handleSubmit={handleSubmit} />
    </Box>
  );
};
