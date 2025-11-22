import { useState, type FC } from "react";
import { Card, CardContent, Box, Typography, Avatar, IconButton, MenuItem, Divider } from "@mui/material";
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
  const navigate = useNavigate();
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const [openDeleteConfirmation, setOpenDeleteConfirmation] = useState(false);
  const [openDeleteSuccess, setOpenDeleteSuccess] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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
        day: "numeric"
      });
    } catch {
      return "N/A";
    }
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
              <SolarPowerIcon />
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
          <Box onClick={handleMenuClick} sx={{ flexShrink: 0 }}>
            <IconButton
              onClick={handleOpenMenu}
              sx={{
                color: "white",
                minWidth: 40,
                minHeight: 40,
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                },
              }}
            >
              <MoreVertIcon />
            </IconButton>
            <MenuTemplate anchorElement={anchorElement} onClose={handleCloseMenu}>
              <Box sx={{ py: 1 }}>
                {/* Ver */}
                <Link to={`/production/${id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <MenuItem
                    sx={{
                      px: 3,
                      py: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      width: '100%',
                      '&:hover': { backgroundColor: '#f8fafc' }
                    }}
                  >
                    <VisibilityOutlinedIcon sx={{ mr: 2, fontSize: 20, color: '#6b7280', flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ color: '#374151', fontWeight: 500, textAlign: 'left' }}>
                      Ver
                    </Typography>
                  </MenuItem>
                </Link>

                {/* Editar */}
                <Link to={`/production/${id}/edit`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <MenuItem
                    sx={{
                      px: 3,
                      py: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      width: '100%',
                      '&:hover': { backgroundColor: '#f8fafc' }
                    }}
                  >
                    <EditOutlinedIcon sx={{ mr: 2, fontSize: 20, color: '#6b7280', flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ color: '#374151', fontWeight: 500, textAlign: 'left' }}>
                      Editar
                    </Typography>
                  </MenuItem>
                </Link>

                <Divider sx={{ my: 1 }} />

                {/* Eliminar */}
                <MenuItem
                  onClick={handleDeleteClick}
                  sx={{
                    px: 3,
                    py: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    width: '100%',
                    '&:hover': { backgroundColor: '#fff5f5' }
                  }}
                >
                  <DeleteOutlineIcon sx={{ mr: 2, fontSize: 20, color: '#dc2626', flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ color: '#dc2626', fontWeight: 500, textAlign: 'left' }}>
                    Eliminar
                  </Typography>
                </MenuItem>
              </Box>
            </MenuTemplate>
          </Box>
        </Box>

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
                borderRadius: 2,
                bgcolor: "rgba(102, 126, 234, 0.08)",
              }}
            >
              <BoltIcon sx={{ color: "#667eea", fontSize: 24 }} />
              <Box>
                <Typography variant="h5" fontWeight="bold" color="#667eea">
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
                borderRadius: 2,
                bgcolor: "rgba(16, 185, 129, 0.08)",
              }}
            >
              <CalendarTodayIcon sx={{ color: "#10b981", fontSize: 24 }} />
              <Box>
                <Typography variant="body1" fontWeight="600" color="#10b981">
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
                bgcolor: "rgba(0, 0, 0, 0.02)",
                borderRadius: 2,
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
