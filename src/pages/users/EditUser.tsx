import { radii, colors, alphas } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { type FC } from "react";
import { Box, Typography, Paper, Avatar, CircularProgress, Alert } from "@mui/material";
import { useNavigate, useParams } from "react-router";
import type { UpdateUserBody } from "../../api/models";
import { BreadCrumb } from "../../components/Breadcrumb";
import { useGetUserById, useUpdateUser } from "../../api/users/users";
import { useErrorDispatch } from "../../context/error.context";
import { PartnerForm, type PartnerFormValues } from "../../components/PartnerForm/PartnerForm";
import PersonIcon from "@mui/icons-material/Person";

export const EditUserPage: FC = () => {
  const { userId = "" } = useParams();
  const errorDispatch = useErrorDispatch();
  const navigate = useNavigate();
  const updateUser = useUpdateUser();

  const { data: userData, isLoading, error } = useGetUserById(userId);

  const handleSubmit = async ({ fullName, personalId, email, address, phoneNumber }: PartnerFormValues) => {
    try {
      const updatedUser = {
        number: userData?.number,
        personalId,
        fullName,
        address,
        email,
        phoneNumber,
        role: userData?.role,
      } as UpdateUserBody;

      const response = await updateUser.mutateAsync({ id: userId, data: updatedUser }, {});
      if (response) {
        navigate("/users");
      } else {
        errorDispatch("Ha habido un problema al editar el usuario. Por favor, inténtalo más tarde");
      }
    } catch {
      errorDispatch("Ha habido un problema al editar el usuario. Por favor, inténtalo más tarde");
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !userData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">No se pudo cargar la información del usuario</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2, sm: 3 },
        p: { xs: 0, sm: 2, md: 3 },
        minHeight: "100vh",
        background: colors.background.default,
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      <Box sx={sxStyles.pageContainerFull}>
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: "Usuarios", href: "/users" },
            { label: userData?.fullName || userId, href: "#" },
            { label: "Editar", href: "#" },
          ]}
        />
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: { xs: 0, sm: radii.large },
          background: (theme) => theme.palette.primary.main,
          color: "white",
          width: { xs: "100%", sm: "auto" },
        }}
      >
        <Box sx={sxStyles.flexRowCenter}>
          <Avatar
            sx={{
              bgcolor: alphas.white.soft,
              width: 56,
              height: 56,
            }}
          >
            <PersonIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h4">Editar usuario</Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              {userData?.fullName}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Box sx={sxStyles.pageContainerFull}>
        <Paper elevation={0} sx={sxStyles.softPanel}>
          <PartnerForm
            mode="edit"
            initialValues={{
              fullName: userData.fullName || "",
              personalId: userData.personalId || "",
              email: userData.email || "",
              address: userData.address || "",
              phoneNumber: userData.phoneNumber || "",
            }}
            handleSubmit={handleSubmit}
            isPending={updateUser.isPending}
            submitLabel="Guardar cambios"
          />
        </Paper>
      </Box>
    </Box>
  );
};
