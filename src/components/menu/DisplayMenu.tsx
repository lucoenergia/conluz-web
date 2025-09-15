import { useState, type FC, type MouseEvent } from "react";
import { Divider, IconButton, MenuItem } from "@mui/material";
import { MenuTemplate } from "./MenuTemplate";
import { MenuLinkItem } from "./MenuLinkItem";
import { LabeledIcon } from "../labeled-icon/LabeledIcon";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import ModeEditOutlineOutlinedIcon from "@mui/icons-material/ModeEditOutlineOutlined";
import NotInterestedOutlinedIcon from "@mui/icons-material/NotInterestedOutlined";

interface DisplayMenuProps {
  disableSupplyPoint: () => void;
  supplyPointId: string;
}

export const DisplayMenu: FC<DisplayMenuProps> = ({ supplyPointId, disableSupplyPoint }) => {
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
  }


  return (
    <>
      <IconButton onClick={handleOpenUserMenu}>
        <MoreVertIcon />
      </IconButton>
      <MenuTemplate anchorElement={anchorElement} onClose={handleCloseUserMenu} compactPadding>
        <MenuLinkItem to={`/supply-points/${supplyPointId}`} className="hidden md:block">
          <LabeledIcon
            variant="compact"
            justify="between"
            iconPosition="right"
            icon={AssessmentOutlinedIcon}
            label="Ver"
          />
        </MenuLinkItem>
        <Divider />
        <MenuLinkItem to={`/supply-points/${supplyPointId}/edit`}>
          <LabeledIcon
            variant="compact"
            justify="between"
            iconPosition="right"
            icon={ModeEditOutlineOutlinedIcon}
            label="Editar"
          />
        </MenuLinkItem>
        <Divider />
        <MenuItem onClick={handleDisableSupplyPoint}>
          <LabeledIcon
            variant="compact"
            justify="between"
            iconPosition="right"
            icon={NotInterestedOutlinedIcon}
            label="Deshabilitar"
          />
        </MenuItem>
      </MenuTemplate>
    </>
  );
};
