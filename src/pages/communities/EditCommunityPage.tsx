import { useState, type FC } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Box,
  Typography,
  Paper,
  Avatar,
  TextField,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import { radii, alphas, colors } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { BreadCrumb } from "../../components/Breadcrumb";
import { useGetCommunityById } from "../../api/communities/communities";
import { useCommunityActions } from "../../hooks/actions";
import { useErrorDispatch } from "../../context/error.context";

export const EditCommunityPage: FC = () => {
  const { communityId = "" } = useParams();
  const navigate = useNavigate();
  const errorDispatch = useErrorDispatch();

  const { data: communityData, isLoading, error } = useGetCommunityById(communityId);

  // The community itself carries the answer, and the action invalidates both the
  // community and the list, so there is nothing left for the page to do.
  const { update } = useCommunityActions().forCommunity(communityData).actions;

  const [name, setName] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [legalId, setLegalId] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [nameError, setNameError] = useState("");
  const [codeError, setCodeError] = useState("");

  const currentName = name ?? communityData?.name ?? "";
  const currentCode = code ?? communityData?.code ?? "";
  const currentLegalId = legalId ?? communityData?.legalId ?? "";
  const currentAddress = address ?? communityData?.address ?? "";

  const validate = (): boolean => {
    let valid = true;
    if (!currentName.trim()) {
      setNameError("El nombre es obligatorio");
      valid = false;
    } else {
      setNameError("");
    }
    if (!currentCode.trim()) {
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
    // The route guard has already established canUpdate, so this only covers the
    // render before the community itself has arrived.
    if (!update) return;

    if (
      await update.run({
        name: currentName.trim(),
        code: currentCode.trim(),
        legalId: currentLegalId.trim() || undefined,
        address: currentAddress.trim() || undefined,
      })
    ) {
      navigate("/communities");
    } else {
      errorDispatch("Ha habido un problema al editar la comunidad. Por favor, inténtalo más tarde.");
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !communityData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">No se pudo cargar la información de la comunidad</Alert>
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
            { label: "Comunidades", href: "/communities" },
            { label: communityData.name || communityId, href: "#" },
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
          <Avatar sx={{ bgcolor: alphas.white.soft, width: 56, height: 56 }}>
            <BusinessIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" component="h1">Editar comunidad</Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              {communityData.name}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Box sx={sxStyles.pageContainerFull}>
        <Paper elevation={0} sx={sxStyles.softPanel}>
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: "flex", flexDirection: "column", gap: 3 }}
          >
            <TextField
              label="Nombre *"
              fullWidth
              value={currentName}
              onChange={(e) => setName(e.target.value)}
              error={!!nameError}
              helperText={nameError}
            />
            <TextField
              label="Código *"
              fullWidth
              value={currentCode}
              onChange={(e) => setCode(e.target.value)}
              error={!!codeError}
              helperText={codeError || "Identificador corto único para la comunidad"}
            />
            <TextField
              label="NIF/CIF"
              fullWidth
              value={currentLegalId}
              onChange={(e) => setLegalId(e.target.value)}
            />
            <TextField
              label="Dirección"
              fullWidth
              value={currentAddress}
              onChange={(e) => setAddress(e.target.value)}
            />

            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              <Button
                variant="outlined"
                onClick={() => navigate("/communities")}
                disabled={update?.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={!update || update.isPending}
              >
                {update?.isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};
