import { useState, type FC } from "react";
import { CardTemplate } from "../cardTemplate/CardTemplate";
import { Box, Chip, Divider, IconButton, Typography } from "@mui/material";
import type { SupplyPointData } from "../../utils/types";
import { MenuTemplate } from "../menu/MenuTemplate";
import { LabeledIcon } from "../labeled-icon/LabeledIcon";
import PercentOutlinedIcon from '@mui/icons-material/PercentOutlined';
import ModeEditOutlineOutlinedIcon from '@mui/icons-material/ModeEditOutlineOutlined';
import WhereToVoteOutlinedIcon from '@mui/icons-material/WhereToVoteOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import NotInterestedOutlinedIcon from '@mui/icons-material/NotInterestedOutlined';

import { MenuLinkItem } from "../menu/MenuLinkItem";

export const SupplyCard: FC<SupplyPointData> = ({
    supplyPointId, 
    kWh, 
    lastCheckTime,
    supplyPointName,
    address,
    average,
    status }) => {

    const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);

    const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElement(event.currentTarget);
    };

    const handleCloseUserMenu = () => {
    setAnchorElement(null);
    };
return <CardTemplate className={'grid grid-flow-col grid-cols-3 items-center justify-items-center grow md:grid-cols-10 gap-4 mt-5'}>
    <Box className="col-span-2 justify-center">
        <Typography className="text-2xl font-semibold">{kWh} kWh</Typography>
        <Typography className="text-sm text-gray-500 justify-center" >(Hace {lastCheckTime})</Typography>
    </Box>
    <Box className='col-span-3 col-start-3 justify-self-start'>
        <Typography className="text-lg font-semibold">{supplyPointName}</Typography>
        <Typography className="text-sm">{supplyPointId}</Typography>
    </Box>
    <Box className='col-span-3 justify-self-start'>
        <LabeledIcon
            icon={WhereToVoteOutlinedIcon}
            iconPosition="left"
            justify="start"
            label= {address}
            labelSize="text-sm"

        />
        <LabeledIcon
            icon={PercentOutlinedIcon}
            iconPosition="left"
            justify="start"
            label={average}
            labelSize="text-sm"
        />
    </Box>
    <Box className='justify-self-end'>{
        <Chip
            label={status === 'activo' ? 'Activo' : 'Inactivo'}
            className={status === 'activo'
                ? 'bg-green-600 text-white md:w-[75px] md:h-8 text-sm leading-8 flex items-center' 
                : 'bg-red-600 text-white md:w-[75px] md:h-8 text-sm leading-8 flex items-center'}
        />
        }
    </Box>
    <Box>
        <IconButton onClick={handleOpenUserMenu}><MoreVertIcon/></IconButton>
        <MenuTemplate 
          anchorElement={anchorElement}
          onClose={handleCloseUserMenu}
          compactPadding>   
            <MenuLinkItem to="/track">
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
    </Box>
</CardTemplate>
}