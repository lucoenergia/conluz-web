import { useState, type FC } from "react"
import { Divider, IconButton } from "@mui/material"
import { MenuTemplate } from "./MenuTemplate"
import { MenuLinkItem } from "./MenuLinkItem"
import { LabeledIcon } from "../labeled-icon/LabeledIcon"
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import ModeEditOutlineOutlinedIcon from '@mui/icons-material/ModeEditOutlineOutlined';
import NotInterestedOutlinedIcon from '@mui/icons-material/NotInterestedOutlined';

export const DisplayMenu: FC = () => {
const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);

const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
setAnchorElement(event.currentTarget);
};

const handleCloseUserMenu = () => {
setAnchorElement(null);
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
            <MenuLinkItem to="/disable">
                <LabeledIcon 
                    variant="compact"
                    justify="between"
                    iconPosition="right"
                    icon={NotInterestedOutlinedIcon}
                    label="Deshabilitar"/>
            </MenuLinkItem>
       </MenuTemplate>
</>    
}