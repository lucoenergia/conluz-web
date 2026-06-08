import { useState, type FC } from "react";
import { useNavigate, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
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
import {
  useGetCommunityById,
  useUpdateCommunity,
  getGetAllCommunitiesQueryKey,
} from "../../api/communities/communities";
import type { UpdateCommunityBody } from "../../api/models";
import { useErrorDispatch } from "../../context/error.context";

export const EditCommunityPage: FC = () => {
  const { communityId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const errorDispatch = useErrorDispatch();
  const updateCommunity = useUpdateCommunity();

  const { data: communityData, isLoading, error } = useGetCommunityById(communityId);

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
    if (!validate() || !communityId) return;

    try {
      await updateCommunity.mutateAsync({
        id: communityId,
        data: {
          name: currentName.trim(),
          code: currentCode.trim(),
          legalId: currentLegalId.trim() || undefined,
          address: currentAddress.trim() || undefined,
        } as UpdateCommunityBody,
      });
      await queryClient.invalidateQueries({ queryKey: getGetAllCommunitiesQueryKey() });
      navigate("/communities");
    } catch {
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
            <Typography variant="h4">Editar comunidad</Typography>
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
                disabled={updateCommunity.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={updateCommunity.isPending}
              >
                {updateCommunity.isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};
