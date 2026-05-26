import { useState, type FC } from "react";
import { Divider, IconButton, MenuItem, Box, Typography } from "@mui/material";
import { MenuTemplate } from "./MenuTemplate";
import { Link } from "react-router";
import { alphas, colors } from "../../theme/tokens";
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
            backgroundColor: alphas.white.hairline,
          },
        }}
      >
        <MoreVertIcon />
      </IconButton>
      <MenuTemplate anchorElement={anchorElement} onClose={handleCloseUserMenu}>
        <Box sx={{ py: 1 }}>
          {/* Ver */}
          <Box component={Link} to={`/supply-points/${supplyPointId}`} sx={{ textDecoration: 'none', color: 'inherit' }}>
            <MenuItem>
              <VisibilityOutlinedIcon sx={{ mr: 2, fontSize: 20, color: colors.text.subtle, flexShrink: 0 }} />
              <Typography variant="body2" sx={{ color: colors.text.body, fontWeight: 500, textAlign: 'left' }}>
                Ver
              </Typography>
            </MenuItem>
          </Box>

          {/* Editar */}
          <Box component={Link} to={`/supply-points/${supplyPointId}/edit`} sx={{ textDecoration: 'none', color: 'inherit' }}>
            <MenuItem>
              <EditOutlinedIcon sx={{ mr: 2, fontSize: 20, color: colors.text.subtle, flexShrink: 0 }} />
              <Typography variant="body2" sx={{ color: colors.text.body, fontWeight: 500, textAlign: 'left' }}>
                Editar
              </Typography>
            </MenuItem>
          </Box>

          <Divider sx={{ my: 1 }} />

          {/* Deshabilitar/Activar */}
          {enabled ? (
            <MenuItem
              onClick={handleDisableSupplyPoint}
              sx={{ '&:hover': { backgroundColor: colors.background.errorFaint } }}
            >
              <BlockOutlinedIcon sx={{ mr: 2, fontSize: 20, color: colors.error.dark, flexShrink: 0 }} />
              <Typography variant="body2" sx={{ color: colors.error.dark, fontWeight: 500, textAlign: 'left' }}>
                Deshabilitar
              </Typography>
            </MenuItem>
          ) : (
            <MenuItem
              onClick={handleEnableSupplyPoint}
              // eslint-disable-next-line no-restricted-syntax -- success-faint hover tint; no token for green bg variant
            sx={{ '&:hover': { backgroundColor: '#f0fdf4' } }}
            >
              {/* eslint-disable-next-line no-restricted-syntax -- success-dark green; CSS keyword unavailable, no matching token */}
              <CheckCircleOutlineIcon sx={{ mr: 2, fontSize: 20, color: '#16a34a', flexShrink: 0 }} />
              {/* eslint-disable-next-line no-restricted-syntax -- success-dark green; CSS keyword unavailable, no matching token */}
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
