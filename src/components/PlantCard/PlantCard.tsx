import { useState, type FC } from "react";
import { CardContent, Box, Typography, Avatar, IconButton, MenuItem, Divider } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { radii, alphas, colors } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import SolarPowerIcon from "@mui/icons-material/SolarPower";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import BoltIcon from "@mui/icons-material/Bolt";
import { useNavigate, Link } from "react-router";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { MenuTemplate } from "../Menu/MenuTemplate";
import { DeleteConfirmationModal } from "../Modals/DeleteConfirmationModal";
import { DeleteSuccessModal } from "../Modals/DeleteSuccessModal";
import { AppCard } from "../AppCard";

interface PlantCardProps {
  id?: string;
  code?: string;
  name?: string;
  address?: string;
  totalPower?: number;
  connectionDate?: string;
  description?: string;
  onDelete: (id: string) => Promise<boolean>;
}

export const PlantCard: FC<PlantCardProps> = ({
  id = "",
  code = "",
  name = "",
  address = "",
  totalPower = 0,
  connectionDate = "",
  description = "",
  onDelete,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const [openDeleteConfirmation, setOpenDeleteConfirmation] = useState(false);
  const [openDeleteSuccess, setOpenDeleteSuccess] = useState(false);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setAnchorElement(event.currentTarget);
  };

  const handleCloseMenu = (event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    setAnchorElement(null);
  };

  const handleCloseDeleteConfirmation = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setOpenDeleteConfirmation(false);
  };

  const handleCloseDeleteSuccess = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setOpenDeleteSuccess(false);
  };

  const handleDelete = async () => {
    setOpenDeleteConfirmation(false);
    const deleted = await onDelete(id);
    if (deleted) {
      setOpenDeleteSuccess(true);
    }
  };

  const handleCardClick = () => {
    navigate(`/production/${id}`);
  };

  const handleMenuClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  const handleDeleteClick = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    handleCloseMenu();
    setOpenDeleteConfirmation(true);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
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
                <SolarPowerIcon />
              </Avatar>
              <Box>
                <Typography variant="h6">{name || "Sin nombre"}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  {code}
                </Typography>
              </Box>
            </Box>
            <Box onClick={handleMenuClick} sx={{ flexShrink: 0 }}>
              <IconButton
                onClick={handleOpenMenu}
                sx={{
                  color: "white",
                  minWidth: 40,
                  minHeight: 40,
                  "&:hover": {
                    backgroundColor: alphas.white.hairline,
                  },
                }}
              >
                <MoreVertIcon />
              </IconButton>
              <MenuTemplate anchorElement={anchorElement} onClose={handleCloseMenu}>
                <Box sx={{ py: 1 }}>
                  <Box
                    component={Link}
                    to={`/production/${id}`}
                    sx={{ textDecoration: "none", color: "inherit" }}
                  >
                    <MenuItem>
                      <VisibilityOutlinedIcon sx={{ mr: 2, fontSize: 20, color: colors.text.subtle, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ color: colors.text.body, fontWeight: 500, textAlign: "left" }}>
                        Ver
                      </Typography>
                    </MenuItem>
                  </Box>

                  <Box
                    component={Link}
                    to={`/production/${id}/edit`}
                    sx={{ textDecoration: "none", color: "inherit" }}
                  >
                    <MenuItem>
                      <EditOutlinedIcon sx={{ mr: 2, fontSize: 20, color: colors.text.subtle, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ color: colors.text.body, fontWeight: 500, textAlign: "left" }}>
                        Editar
                      </Typography>
                    </MenuItem>
                  </Box>

                  <Divider sx={{ my: 1 }} />

                  <MenuItem
                    onClick={handleDeleteClick}
                    sx={{ "&:hover": {
                      backgroundColor: colors.background.errorFaint,
                    } }}
                  >
                    <DeleteOutlineIcon sx={{ mr: 2, fontSize: 20, color: "error.dark", flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ color: "error.dark", fontWeight: 500, textAlign: "left" }}>
                      Eliminar
                    </Typography>
                  </MenuItem>
                </Box>
              </MenuTemplate>
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
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
              gap: 2,
              mb: 3,
            }}
          >
            {/* Total Power */}
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
                  {totalPower || 0} kW
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Potencia total
                </Typography>
              </Box>
            </Box>

            {/* Connection Date */}
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
              <CalendarTodayIcon sx={{ color: "success.main", fontSize: 24 }} />
              <Box>
                <Typography variant="body1" fontWeight="600" color="success.main">
                  {formatDate(connectionDate)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Fecha de conexión
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Description */}
          {description && (
            <Box
              sx={{
                mb: 2,
                p: 2,
                bgcolor: alphas.black.ghost,
                borderRadius: radii.default,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            </Box>
          )}

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
      <DeleteConfirmationModal
        isOpen={openDeleteConfirmation}
        code={code}
        onCancel={handleCloseDeleteConfirmation}
        onDelete={handleDelete}
      />
      <DeleteSuccessModal
        isOpen={openDeleteSuccess}
        onClose={handleCloseDeleteSuccess}
        code={code}
      />
    </>
  );
};
