import { radii, colors, alphas } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { type FC } from "react";
import { Box, Typography, Paper, Avatar } from "@mui/material";
import { useNavigate } from "react-router";
import type { CreateUserBody } from "../../api/models";
import { useCreateUser } from "../../api/users/users";
import { useErrorDispatch } from "../../context/error.context";
import { BreadCrumb } from "../../components/Breadcrumb";
import { PartnerForm, type PartnerFormValues } from "../../components/PartnerForm/PartnerForm";
import PersonIcon from "@mui/icons-material/Person";

export const CreatePartnerPage: FC = () => {
  const navigate = useNavigate();
  const errorDispatch = useErrorDispatch();
  const createUser = useCreateUser();

  const handleSubmit = async ({ fullName, personalId, number, email, address, phoneNumber, password, role }: PartnerFormValues) => {
    try {
      const newUser = {
        fullName,
        personalId,
        number: number ?? 0,
        email,
        address: address || undefined,
        phoneNumber: phoneNumber || undefined,
        password: password ?? "",
        role,
      } as CreateUserBody;

      const response = await createUser.mutateAsync({ data: newUser });
      if (response) {
        navigate("/partners");
      } else {
        errorDispatch("Ha habido un problema al crear el socio. Por favor, inténtalo más tarde");
      }
    } catch {
      errorDispatch("Ha habido un problema al crear el socio. Por favor, inténtalo más tarde");
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
      {/* Breadcrumb */}
      <Box sx={sxStyles.pageContainerFull}>
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: "Socios", href: "/partners" },
            { label: "Nuevo", href: "/partners/new" },
          ]}
        />
      </Box>

      {/* Header Section */}
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
            <Typography variant="h4">
              Crear nuevo socio
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Registra un nuevo socio en la comunidad energética
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Form Section */}
      <Box sx={sxStyles.pageContainerFull}>
        <Paper
          elevation={0}
          sx={sxStyles.softPanel}
        >
          <PartnerForm
            mode="create"
            handleSubmit={handleSubmit}
            isPending={createUser.isPending}
            submitLabel="Crear socio"
          />
        </Paper>
      </Box>
    </Box>
  );
};
