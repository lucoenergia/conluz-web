import { useState, type FC } from "react"
import { Divider, IconButton } from "@mui/material"
import { MenuTemplate } from "./MenuTemplate"
import { MenuLinkItem } from "./MenuLinkItem"
import { LabeledIcon } from "../labeled-icon/LabeledIcon"
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import ModeEditOutlineOutlinedIcon from '@mui/icons-material/ModeEditOutlineOutlined';
import NotInterestedOutlinedIcon from '@mui/icons-material/NotInterestedOutlined';

interface DisplayMenuProps {
  supplyPointId: string
}

export const DisplayMenu: FC<DisplayMenuProps> = ({ supplyPointId }) => {
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    setAnchorElement(event.currentTarget);
  };

  const handleCloseUserMenu = (event: any) => {
    event.preventDefault();
    setAnchorElement(null);
  };

  return <>
    <IconButton onClick={handleOpenUserMenu}><MoreVertIcon /></IconButton>
    <MenuTemplate
      anchorElement={anchorElement}
      onClose={handleCloseUserMenu}
      compactPadding>
      <MenuLinkItem to={`/supply-points/${supplyPointId}`} className="hidden md:block" >
        <LabeledIcon
          variant="compact"
          justify="between"
          iconPosition="right"
          icon={AssessmentOutlinedIcon}
          label="Ver" />
      </MenuLinkItem>
      <Divider />
      <MenuLinkItem to={`/supply-points/${supplyPointId}/edit`}>
        <LabeledIcon
          variant="compact"
          justify="between"
          iconPosition="right"
          icon={ModeEditOutlineOutlinedIcon}
          label="Editar" />
      </MenuLinkItem>
      <Divider />
      <MenuLinkItem to="/disable">
        <LabeledIcon
          variant="compact"
          justify="between"
          iconPosition="right"
          icon={NotInterestedOutlinedIcon}
          label="Deshabilitar" />
      </MenuLinkItem>
    </MenuTemplate>
  </>
}
