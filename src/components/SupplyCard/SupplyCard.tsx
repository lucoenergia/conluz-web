import { useState, type FC } from "react";
import { Card, CardContent, Box, Typography, Chip, Avatar } from "@mui/material";
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

interface SupplyCardProps {
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
  const navigate = useNavigate();
  const [openDisableConfirmation, setOpenDisableConfirmation] = useState(false);
  const [openDisableSuccess, setOpenDisableSuccess] = useState(false);
  const [openEnableConfirmation, setOpenEnableConfirmation] = useState(false);
  const [openEnableSuccess, setOpenEnableSuccess] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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
      <Card
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        sx={{
          cursor: "pointer",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
          borderRadius: 2,
          boxShadow: isHovered ? "0 8px 30px 0 rgba(0,0,0,0.12)" : "0 4px 20px 0 rgba(0,0,0,0.08)",
          transform: isHovered ? "translateY(-4px)" : "translateY(0)",
          width: "100%",
          minWidth: 0,
          "&:hover": {
            "& .card-header": {
              background: "#667eea",
            },
          },
        }}
      >
        {/* Header */}
        <Box
          className="card-header"
          sx={{
            background: "#667eea",
            p: 2,
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            transition: "background 0.3s ease",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.2)",
                width: 48,
                height: 48,
              }}
            >
              {enabled ? <PowerIcon /> : <PowerOffIcon />}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="600">
                {name || "Sin nombre"}
              </Typography>
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
                backgroundColor: enabled ? "#10b981" : "#ef4444",
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
        </Box>

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
            {/* Last Measurement */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: "rgba(102, 126, 234, 0.08)",
              }}
            >
              <BoltIcon sx={{ color: "#667eea", fontSize: 24 }} />
              <Box>
                <Typography variant="h5" fontWeight="bold" color="#667eea">
                  {lastMeasurement || 0} kWh
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Último consumo
                </Typography>
              </Box>
            </Box>

            {/* Partition Coefficient */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: "rgba(236, 72, 153, 0.08)",
              }}
            >
              <PercentIcon sx={{ color: "#ec4899", fontSize: 24 }} />
              <Box>
                <Typography variant="h5" fontWeight="bold" color="#ec4899">
                  {partitionCoefficient.toFixed(2)}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Coeficiente
                </Typography>
              </Box>
            </Box>

            {/* Last Connection */}
            <Box
              sx={{
                display: { xs: "flex", md: "flex" },
                alignItems: "center",
                gap: 1.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: "rgba(16, 185, 129, 0.08)",
              }}
            >
              <AccessTimeIcon sx={{ color: "#10b981", fontSize: 24 }} />
              <Box>
                <Typography variant="body1" fontWeight="600" color="#10b981">
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
              bgcolor: "rgba(0, 0, 0, 0.02)",
              borderRadius: 2,
            }}
          >
            <LocationOnIcon sx={{ color: "#64748b", fontSize: 20 }} />
            <Typography variant="body2" color="text.secondary">
              {address || "Dirección no disponible"}
            </Typography>
          </Box>

        </CardContent>
      </Card>

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