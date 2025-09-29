import { useState, type FC } from "react";
import { Divider, IconButton, MenuItem, Box, Typography } from "@mui/material";
import { MenuTemplate } from "./MenuTemplate";
import { Link } from "react-router";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

interface DisplayMenuProps {
  disableSupplyPoint: () => void;
  enableSupplyPoint: () => void;
  supplyPointId: string;
  enabled: boolean;
}

export const DisplayMenu: FC<DisplayMenuProps> = ({
  supplyPointId,
  disableSupplyPoint,
  enableSupplyPoint,
  enabled,
}) => {
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    setAnchorElement(event.currentTarget);
  };

  const handleCloseUserMenu = (event?: React.MouseEvent) => {
    event?.preventDefault();
    setAnchorElement(null);
  };

  const handleDisableSupplyPoint = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    handleCloseUserMenu();
    disableSupplyPoint();
  };

  const handleEnableSupplyPoint = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    handleCloseUserMenu();
    enableSupplyPoint();
  };

  return (
    <>
      <IconButton
        onClick={handleOpenUserMenu}
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
      <MenuTemplate anchorElement={anchorElement} onClose={handleCloseUserMenu}>
        <Box sx={{ py: 1 }}>
          {/* Ver */}
          <Link to={`/supply-points/${supplyPointId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
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
          <Link to={`/supply-points/${supplyPointId}/edit`} style={{ textDecoration: 'none', color: 'inherit' }}>
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

          {/* Deshabilitar/Activar */}
          {enabled ? (
            <MenuItem
              onClick={handleDisableSupplyPoint}
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
              <BlockOutlinedIcon sx={{ mr: 2, fontSize: 20, color: '#dc2626', flexShrink: 0 }} />
              <Typography variant="body2" sx={{ color: '#dc2626', fontWeight: 500, textAlign: 'left' }}>
                Deshabilitar
              </Typography>
            </MenuItem>
          ) : (
            <MenuItem
              onClick={handleEnableSupplyPoint}
              sx={{
                px: 3,
                py: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                width: '100%',
                '&:hover': { backgroundColor: '#f0fdf4' }
              }}
            >
              <CheckCircleOutlineIcon sx={{ mr: 2, fontSize: 20, color: '#16a34a', flexShrink: 0 }} />
              <Typography variant="body2" sx={{ color: '#16a34a', fontWeight: 500, textAlign: 'left' }}>
                Activar
              </Typography>
            </MenuItem>
          )}
        </Box>
      </MenuTemplate>
    </>
  );
};
