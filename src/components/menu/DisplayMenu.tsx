import { useState, type FC } from "react"
import { Divider, IconButton, MenuItem } from "@mui/material"
import { MenuTemplate } from "./MenuTemplate"
import { MenuLinkItem } from "./MenuLinkItem"
import { LabeledIcon } from "../labeled-icon/LabeledIcon"
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import ModeEditOutlineOutlinedIcon from '@mui/icons-material/ModeEditOutlineOutlined';
import NotInterestedOutlinedIcon from '@mui/icons-material/NotInterestedOutlined';
import { DisablePointModal } from "../modals/DisablePointModal"
import { DisableConfirmationModal } from "../modals/DisableConfirmationModal"

interface DisplayMenuProps {
    code: string,
    disableSupplyPoint: (code:string) => void,
    supplyPointId: string,
    disableSuccess: boolean
}

export const DisplayMenu: FC<DisplayMenuProps> = ({ disableSuccess, supplyPointId, code, disableSupplyPoint}) => {
const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
const [isModalOpen, setIsModalOpen] = useState(false);  
const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);

const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    setAnchorElement(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElement(null);
  };

const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
      event.preventDefault();
    setIsModalOpen(true);
    handleCloseUserMenu();
}

const handleCloseDisableModal = () => {
    setIsModalOpen(false);
    setIsConfirmationModalOpen(true);
};

const handleCloseConfirModal = () => {
    setIsConfirmationModalOpen(false);
}

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
      <MenuItem onClick={handleOpen}>
        <LabeledIcon
          variant="compact"
          justify="between"
          iconPosition="right"
          icon={NotInterestedOutlinedIcon}
          label="Deshabilitar" />
      </MenuItem>
            <DisablePointModal 
                isOpen={isModalOpen} 
                code={code} 
                disableSupplyPoint={disableSupplyPoint}
                onClose={handleCloseDisableModal}/>
            <DisableConfirmationModal isOpen={isConfirmationModalOpen && disableSuccess} onClose={handleCloseConfirModal} code={code}/>
    </MenuTemplate>
  </>
}
