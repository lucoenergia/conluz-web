import { useState, type FC } from "react";
import { CardTemplate } from "../cardTemplate/CardTemplate";
import { Box, Chip, Divider, IconButton, Typography } from "@mui/material";
import { MenuTemplate } from "../menu/MenuTemplate";
import { LabeledIcon } from "../labeled-icon/LabeledIcon";
import PercentOutlinedIcon from '@mui/icons-material/PercentOutlined';
import ModeEditOutlineOutlinedIcon from '@mui/icons-material/ModeEditOutlineOutlined';
import WhereToVoteOutlinedIcon from '@mui/icons-material/WhereToVoteOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import NotInterestedOutlinedIcon from '@mui/icons-material/NotInterestedOutlined';
import { MenuLinkItem } from "../menu/MenuLinkItem";
import type { itemListType } from "../supplyPointsPage/SupplyPointsPage";


// generar unas props propias, pq no necesita todos los campos del supplresponse 
// y tb por aislar las dependencias -> ahora mismo lo hacemos depender de orval
// apañar para que si viene undefined de supplyresponse pongamos un string vacío
export const SupplyCard: FC<itemListType> = ({
    id, 
    name,
    address,
    partitionCoefficient,
    enabled,
    datadisValidDateFrom,
    datadisPointType,
    }) => {

    const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
    const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElement(event.currentTarget);
    };

    const handleCloseUserMenu = () => {
    setAnchorElement(null);
    };

return <CardTemplate className={'grid grid-flow-col grid-cols-5 h-18 items-center justify-items-center md:content-center md:grid-cols-10 gap-4 mt-5'}>
    <Box className="col-span-2 justify-center hidden md:block">
        <Typography className="text-2xl font-semibold">{partitionCoefficient} kWh</Typography>
        <Typography className="text-sm text-gray-500 justify-center" >(Hace {datadisValidDateFrom})</Typography>
    </Box>
    <Box className='col-span-3 md:col-span-3 md:col-start-3 justify-self-start'>
        <Typography className="text-lg font-semibold ml-4 md:ml-0">{name}</Typography>
        <Typography className="text-sm ml-4 md:ml-0">{id}</Typography>
    </Box>
    <Box className='col-span-3 justify-self-start hidden md:block'>
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
            label={datadisPointType}
            labelSize="text-sm"
        />
    </Box>
    <Box className='justify-self-end md:self-center'>
        {/* //estaría guay extraer este componente a uno genérico (y así no hay que volverle a poner estos estilos, lo tenemos encapsulado) */}
        <Chip
            label={enabled ? 'Activo' : 'Inactivo'}
            // por qué no poner w-6xl ? Evitar poner número en píxeles concretos.
            className={`w-[65.17px] md:w-[75px] h-6 md:h-8 text-xs md:text-sm leading-6 md:leading-8 flex items-center justify-center mb-2 md:mb-0 text-white 
                ${ enabled ? 'bg-green-600' : 'bg-red-600'}`
            }
        />
        <Typography className="text-sm text-gray-500 text-center md:hidden">{partitionCoefficient} kWh</Typography>
    </Box>

                    {/* coger todo este box con menutemplate y el iconbutton a un componente aparte */}

    <Box>

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
    </Box>
</CardTemplate>
}