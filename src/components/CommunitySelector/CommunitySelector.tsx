import { useState, type FC } from "react";
import { Box, Typography, MenuItem, Chip } from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { MenuTemplate } from "../Menu/MenuTemplate";
import { colors, fontSizes } from "../../theme/tokens";
import { useActiveCommunityDetails } from "../../hooks/useActiveCommunityDetails";

export const CommunitySelector: FC = () => {
  const { activeCommunityId, activeCommunity, communities, membershipCount, select } = useActiveCommunityDetails();
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElement(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorElement(null);
  };

  const handleSelect = (communityId: string) => {
    select(communityId);
    handleClose();
  };

  if (membershipCount === 0) return null;

  if (membershipCount === 1) {
    return (
      <Chip
        icon={<BusinessIcon sx={{ fontSize: 16 }} />}
        label={
          <Typography variant="body2" sx={{ fontSize: fontSizes.sm, fontWeight: 500, color: colors.text.body }}>
            {activeCommunity?.name ?? "Comunidad"}
          </Typography>
        }
        variant="outlined"
        sx={{
          borderColor: colors.border.light,
          backgroundColor: colors.background.surface,
          "& .MuiChip-label": { px: 1 },
        }}
      />
    );
  }

  return (
    <>
      <Chip
        icon={<BusinessIcon sx={{ fontSize: 16 }} />}
        label={
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography variant="body2" sx={{ fontSize: fontSizes.sm, fontWeight: 500, color: colors.text.body }}>
              {activeCommunity?.name ?? (activeCommunityId ? "Comunidad" : "Seleccionar comunidad")}
            </Typography>
            <KeyboardArrowDownIcon sx={{ fontSize: 16, color: colors.text.subtle }} />
          </Box>
        }
        onClick={handleOpen}
        variant="outlined"
        sx={{
          borderColor: colors.border.light,
          backgroundColor: colors.background.surface,
          cursor: "pointer",
          "& .MuiChip-label": { px: 1 },
          "&:hover": { backgroundColor: colors.background.default },
        }}
      />
      <MenuTemplate anchorElement={anchorElement} onClose={handleClose} compactPadding>
        <Box sx={{ py: 1 }}>
          <Typography
            variant="caption"
            sx={{ px: 2, py: 0.5, display: "block", color: colors.text.subtle, fontWeight: 600, fontSize: fontSizes.xs }}
          >
            Tus comunidades
          </Typography>
          {communities.map((community) => (
            <MenuItem
              key={community.id}
              selected={community.id === activeCommunityId}
              onClick={() => handleSelect(community.id!)}
              sx={{ fontSize: fontSizes.md, color: colors.text.body }}
            >
              <BusinessIcon sx={{ mr: 1.5, fontSize: 18, color: colors.text.subtle }} />
              {community.name}
            </MenuItem>
          ))}
        </Box>
      </MenuTemplate>
    </>
  );
};
