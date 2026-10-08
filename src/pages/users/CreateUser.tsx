import { radii, colors, alphas } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { type FC } from "react";
import { Box, Typography, Paper, Avatar } from "@mui/material";
import { useNavigate } from "react-router";
import { type CreateUserBody } from "../../api/models";
import { usePlatformActions } from "../../hooks/actions";
import { useErrorDispatch } from "../../context/error.context";
import { getFirstApiErrorMessage } from "../../errors/apiErrorCatalogue";
import { BreadCrumb } from "../../components/Breadcrumb";
import { UserForm, type UserFormValues } from "../../components/UserForm/UserForm";
import PersonIcon from "@mui/icons-material/Person";

export const CreateUserPage: FC = () => {
  const navigate = useNavigate();
  const errorDispatch = useErrorDispatch();
  // The platform's canCreateUsers, not a community's: this form names no
  // community, so it creates a user attached to none -- which is the question
  // the platform flag answers. Creating one INSIDE a community is the
  // community's own canCreateUsers, and that is a different surface.
  const { createUser } = usePlatformActions().actions;

  const handleSubmit = async ({ fullName, personalId, number, email, address, phoneNumber, password }: UserFormValues) => {
    // The route guard has already established canCreateUsers, so this only covers
    // the render before the current user has arrived.
    if (!createUser) return;

    const newUser: CreateUserBody = {
      fullName,
      personalId,
      number: number ?? 0,
      email,
      address: address || undefined,
      phoneNumber: phoneNumber || undefined,
      password: password ?? "",
    };

    const result = await createUser.run(newUser);
    if ("user" in result) {
      navigate("/users");
    } else {
      // The API's own reason when it gives one -- a password that breaks the
      // policy names the rule (#196) -- and the generic sentence otherwise.
      errorDispatch(
        getFirstApiErrorMessage(
          result.error,
          "Ha habido un problema al crear el usuario. Por favor, inténtalo más tarde",
        ),
      );
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
            { label: "Nuevo", href: "/users/new" },
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
          // Padding inside the phone width; at sm the width is auto (#211).
          boxSizing: "border-box",
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
            <Typography variant="h4" component="h1">Crear nuevo usuario</Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Registra un nuevo usuario en la plataforma
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Box sx={sxStyles.pageContainerFull}>
        <Paper elevation={0} sx={sxStyles.softPanel}>
          <UserForm
            mode="create"
            handleSubmit={handleSubmit}
            isPending={createUser?.isPending ?? false}
            disabled={!createUser}
            submitLabel="Crear usuario"
          />
        </Paper>
      </Box>
    </Box>
  );
};
