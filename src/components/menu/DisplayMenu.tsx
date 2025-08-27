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

interface DisplayMenuProps {
    code: string,
    disableSupplyPoint: (code:string) => void
}

export const DisplayMenu: FC<DisplayMenuProps> = ({code, disableSupplyPoint}) => {
const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
const [isModalOpen, setIsModalOpen] = useState(false);const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
setAnchorElement(event.currentTarget);
};

const handleCloseUserMenu = () => {
setAnchorElement(null);
};

const handleOpen = () => {
console.log('click en deshabilitar');
console.log('code ', code);
setIsModalOpen(true);
handleCloseUserMenu();
}

const handleCloseModal = () => {
setIsModalOpen(false);
};


return <>
        <IconButton onClick={handleOpenUserMenu}><MoreVertIcon/></IconButton>
        <MenuTemplate 
          anchorElement={anchorElement}
          onClose={handleCloseUserMenu}
          compactPadding>  
            <MenuLinkItem to="/track" className="hidden md:block" >
                <LabeledIcon 
                    variant="compact"
                    justify="between"
                    iconPosition="right"
                    icon={AssessmentOutlinedIcon}
                    label="Ver"/>
            </MenuLinkItem>
            <Divider/>
            <MenuLinkItem to="/edit">
                <LabeledIcon 
                    variant="compact"
                    justify="between"
                    iconPosition="right"
                    icon={ModeEditOutlineOutlinedIcon}
                    label="Editar"/>
            </MenuLinkItem>
            <Divider />
            <MenuItem onClick={handleOpen}>
                <LabeledIcon 
                    variant="compact"
                    justify="between"
                    iconPosition="right"
                    icon={NotInterestedOutlinedIcon}
                    label="Deshabilitar"/>
            </MenuItem>
            <DisablePointModal 
                isOpen={isModalOpen} 
                code={code} 
                disableSupplyPoint={disableSupplyPoint}
                onClose={handleCloseModal}/>
       </MenuTemplate>
</>    
}