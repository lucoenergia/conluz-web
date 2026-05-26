import { useState, type FC } from "react";
import { CardContent, Box, Typography, Chip, Avatar } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { radii, alphas, colors } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PercentIcon from "@mui/icons-material/Percent";
import BoltIcon from "@mui/icons-material/Bolt";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PowerIcon from "@mui/icons-material/Power";
import PowerOffIcon from "@mui/icons-material/PowerOff";
import { useNavigate } from "react-router";
import { DisplayMenu } from "../Menu/DisplayMenu";
import { DisableSuccessModal } from "../Modals/DisableSuccessModal";
import { EnableConfirmationModal } from "../Modals/EnableConfirmationModal";
import { EnableSuccessModal } from "../Modals/EnableSuccesModal";
import { DisableConfirmationModal } from "../Modals/DisableConfirmationModal";
import { AppCard } from "../AppCard";

export interface SupplyCardProps {
  id?: string;
  code?: string;
  name?: string;
  address?: string;
  partitionCoefficient?: number;
  enabled?: boolean;
  lastConnection?: string;
  lastMeasurement?: number;
  onDisable: (id: string) => Promise<boolean>;
  onEnable: (id: string) => Promise<boolean>;
}

export const SupplyCard: FC<SupplyCardProps> = ({
  id = "",
  code = "",
  name = "",
  address = "",
  partitionCoefficient = 0,
  enabled = false,
  lastConnection = "",
  lastMeasurement = 0,
  onDisable,
  onEnable,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [openDisableConfirmation, setOpenDisableConfirmation] = useState(false);
  const [openDisableSuccess, setOpenDisableSuccess] = useState(false);
  const [openEnableConfirmation, setOpenEnableConfirmation] = useState(false);
  const [openEnableSuccess, setOpenEnableSuccess] = useState(false);

  const handleCloseDisableConfirmation = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setOpenDisableConfirmation(false);
  };

  const handleCloseDisableSuccess = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setOpenDisableSuccess(false);
  };

  const handleDisable = async () => {
    setOpenDisableConfirmation(false);
    const disabled = await onDisable(id);
    if (disabled) {
      setOpenDisableSuccess(true);
    }
  };

  const handleCloseEnableConfirmation = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setOpenEnableConfirmation(false);
  };

  const handleCloseEnableSuccess = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setOpenEnableSuccess(false);
  };

  const handleEnable = async () => {
    setOpenEnableConfirmation(false);
    const enabledResult = await onEnable(id);
    if (enabledResult) {
      setOpenEnableSuccess(true);
    }
  };

  const handleCardClick = () => {
    navigate(`/supply-points/${id}`);
  };

  const handleMenuClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <>
      <AppCard
        onClick={handleCardClick}
        sx={{
          cursor: "pointer",
          minWidth: 0,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            transform: "translateY(-4px)",
          },
        }}
        header={
          <>
            <Box sx={sxStyles.flexRowCenter}>
              <Avatar sx={{ bgcolor: alphas.white.soft, width: 48, height: 48 }}>
                {enabled ? <PowerIcon /> : <PowerOffIcon />}
              </Avatar>
              <Box>
                <Typography variant="h6">{name || "Sin nombre"}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  {code}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
              <Chip
                label={enabled ? "Activo" : "Inactivo"}
                size="small"
                sx={{
                  backgroundColor: enabled ? colors.success : colors.error.main,
                  color: "white",
                  fontWeight: 600,
                  display: { xs: "none", sm: "flex" },
                }}
              />
              <Box onClick={handleMenuClick} sx={{ flexShrink: 0 }}>
                <DisplayMenu
                  supplyPointId={id}
                  disableSupplyPoint={() => setOpenDisableConfirmation(true)}
                  enableSupplyPoint={() => setOpenEnableConfirmation(true)}
                  enabled={enabled}
                />
              </Box>
            </Box>
          </>
        }
      >
        {/* Content */}
        <CardContent sx={{ p: 3 }}>
          {/* Metrics Row */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
              gap: 2,
              mb: 3,
            }}
          >
            {/* Partition Coefficient */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.5,
                borderRadius: radii.default,
                // eslint-disable-next-line no-restricted-syntax -- partition-coefficient pink (#ec4899 alpha tint); brand accent without a token
                bgcolor: "rgba(236, 72, 153, 0.08)",
              }}
            >
              {/* eslint-disable-next-line no-restricted-syntax -- partition-coefficient pink (#ec4899); brand accent without a token */}
              <PercentIcon sx={{ color: "#ec4899", fontSize: 24 }} />
              <Box>
                <Typography variant="h5" sx={{
                  // eslint-disable-next-line no-restricted-syntax -- partition-coefficient pink (#ec4899); brand accent without a token
                  color: "#ec4899",
                }}>
                  {partitionCoefficient.toFixed(2)}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Coeficiente de reparto
                </Typography>
              </Box>
            </Box>

            {/* Last Measurement */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.5,
                borderRadius: radii.default,
                bgcolor: alpha(theme.palette.primary.main, 0.08),
              }}
            >
              <BoltIcon sx={{ color: "primary.main", fontSize: 24 }} />
              <Box>
                <Typography variant="h5" color={theme.palette.primary.main}>
                  {lastMeasurement || 0} kWh
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Último consumo
                </Typography>
              </Box>
            </Box>

            {/* Last Connection */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.5,
                borderRadius: radii.default,
                bgcolor: alphas.success.subtle,
              }}
            >
              <AccessTimeIcon sx={{ color: "success.main", fontSize: 24 }} />
              <Box>
                <Typography variant="body1" fontWeight="600" color="success.main">
                  {lastConnection || "N/A"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Última conexión
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Address */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              p: 2,
              bgcolor: alphas.black.ghost,
              borderRadius: radii.default,
            }}
          >
            <LocationOnIcon sx={{ color: "text.secondary", fontSize: 20 }} />
            <Typography variant="body2" color="text.secondary">
              {address || "Dirección no disponible"}
            </Typography>
          </Box>
        </CardContent>
      </AppCard>

      {/* Modals */}
      <DisableConfirmationModal
        isOpen={openDisableConfirmation}
        code={code}
        onCancel={handleCloseDisableConfirmation}
        onDisable={handleDisable}
      />
      <DisableSuccessModal isOpen={openDisableSuccess} onClose={handleCloseDisableSuccess} code={code} />
      <EnableConfirmationModal
        isOpen={openEnableConfirmation}
        code={code}
        onCancel={handleCloseEnableConfirmation}
        onEnable={handleEnable}
      />
      <EnableSuccessModal isOpen={openEnableSuccess} onClose={handleCloseEnableSuccess} code={code} />
    </>
  );
};
