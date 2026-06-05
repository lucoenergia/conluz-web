import { useState, type FC } from "react";
import { useNavigate } from "react-router";
import {
  Box,
  Typography,
  Paper,
  Avatar,
  TextField,
  Button,
  Alert,
} from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import { radii, alphas, colors } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { BreadCrumb } from "../../components/Breadcrumb";
import { useCreateCommunity } from "../../api/communities/communities";
import { useErrorDispatch } from "../../context/error.context";

export const CreateCommunityPage: FC = () => {
  const navigate = useNavigate();
  const errorDispatch = useErrorDispatch();
  const createCommunity = useCreateCommunity();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [legalId, setLegalId] = useState("");
  const [address, setAddress] = useState("");
  const [nameError, setNameError] = useState("");
  const [codeError, setCodeError] = useState("");

  const validate = (): boolean => {
    let valid = true;
    if (!name.trim()) {
      setNameError("El nombre es obligatorio");
      valid = false;
    } else {
      setNameError("");
    }
    if (!code.trim()) {
      setCodeError("El código es obligatorio");
      valid = false;
    } else {
      setCodeError("");
    }
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const response = await createCommunity.mutateAsync({
        data: {
          name: name.trim(),
          code: code.trim(),
          legalId: legalId.trim() || undefined,
          address: address.trim() || undefined,
        },
      });
      if (response) {
        navigate("/communities");
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        errorDispatch(
          "La creación de comunidades no está habilitada en este servidor (multi-community mode desactivado).",
        );
      } else {
        errorDispatch(
          "Ha habido un problema al crear la comunidad. Por favor, inténtalo más tarde.",
        );
      }
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
            { label: "Comunidades", href: "/communities" },
            { label: "Nueva", href: "/communities/new" },
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
          <Avatar sx={{ bgcolor: alphas.white.soft, width: 56, height: 56 }}>
            <BusinessIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h4">Crear nueva comunidad</Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Registra una nueva comunidad energética en la plataforma
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Box sx={sxStyles.pageContainerFull}>
        <Paper elevation={0} sx={sxStyles.softPanel}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Esta operación requiere que el servidor tenga el modo multi-comunidad habilitado.
          </Alert>

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: "flex", flexDirection: "column", gap: 3 }}
          >
            <TextField
              label="Nombre *"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={!!nameError}
              helperText={nameError}
            />
            <TextField
              label="Código *"
              fullWidth
              value={code}
              onChange={(e) => setCode(e.target.value)}
              error={!!codeError}
              helperText={codeError || "Identificador corto único para la comunidad"}
            />
            <TextField
              label="NIF/CIF"
              fullWidth
              value={legalId}
              onChange={(e) => setLegalId(e.target.value)}
            />
            <TextField
              label="Dirección"
              fullWidth
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              <Button
                variant="outlined"
                onClick={() => navigate("/communities")}
                disabled={createCommunity.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={createCommunity.isPending}
              >
                {createCommunity.isPending ? "Creando..." : "Crear comunidad"}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};
