import { type FC } from "react";
import { Box, Typography, Paper, Avatar } from "@mui/material";
import { useNavigate, useParams } from "react-router";
import type { UpdateSupplyBody } from "../api/models";
import { EnhancedBreadCrumb } from "../components/Breadcrumb";
import { SupplyForm, type SupplyFormValues } from "../components/SupplyForm/SupplyForm";
import { useGetSupply, useUpdateSupply } from "../api/supplies/supplies";
import { useErrorDispatch } from "../context/error.context";
import ElectricMeterIcon from "@mui/icons-material/ElectricMeter";

export const EditSupplyPage: FC = () => {
  const { supplyPointId = "" } = useParams();
  const errorDispatch = useErrorDispatch();
  const navigate = useNavigate();
  const updateSupply = useUpdateSupply();

  const { data: supplyPoint, isLoading, error, refetch } = useGetSupply(supplyPointId);

  const handleSubmit = async ({ name, cups, address, partitionCoefficient, addressRef, personalId }: SupplyFormValues) => {
    try {
      const updatedSupply = {
        name,
        code: cups,
        address,
        partitionCoefficient,
        addressRef,
      } as UpdateSupplyBody;
      const response = await updateSupply.mutateAsync({ id: supplyPointId, data: updatedSupply }, {});
      if (response) {
        refetch();
        navigate("/supply-points");
      } else {
        errorDispatch("Hay habido un problema al editar el punto de suministro. Por favor, inténtalo más tarde");
      }
    } catch (e) {
      errorDispatch("Hay habido un problema al editar el punto de suministro. Por favor, inténtalo más tarde");
    }
  };
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2, sm: 3 },
        p: { xs: 0, sm: 2, md: 3 },
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      {/* Breadcrumb */}
      <Box sx={{ px: { xs: 2, sm: 0 }, width: "100%" }}>
        <EnhancedBreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: "Puntos de Suministro", href: "/supply-points" },
            { label: supplyPoint?.code ? supplyPoint.code : supplyPointId, href: `/supply-points/${supplyPointId}` },
            { label: "Editar", href: "#" },
          ]}
        />
      </Box>

      {/* Header Section */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: { xs: 0, sm: 3 },
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          mx: { xs: 0, sm: 0 },
          width: { xs: "100%", sm: "auto" },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.2)",
              width: 56,
              height: 56,
            }}
          >
            <ElectricMeterIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Editar punto de suministro
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              {supplyPoint?.name || "Cargando..."}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Form Section */}
      <Box sx={{ px: { xs: 2, sm: 0 }, width: "100%" }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: { xs: 2, sm: 3 },
            bgcolor: "white",
            boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
            width: "100%",
          }}
        >
          {!isLoading && !error && (
            <SupplyForm
              initialValues={{
                name: supplyPoint?.name,
                cups: supplyPoint?.code,
                address: supplyPoint?.address,
                partitionCoefficient: supplyPoint?.partitionCoefficient,
                addressRef: supplyPoint?.addressRef,
                personalId: supplyPoint?.user?.personalId,
              }}
              handleSubmit={handleSubmit}
              showUserSelector={true}
              selectedUserId={supplyPoint?.user?.id}
              disableUserSelector={true}
            />
          )}
        </Paper>
      </Box>
    </Box>
  );
};
