import { useState, type FC } from "react";
import { CardTemplate } from "../cardTemplate/CardTemplate";
import { Box, Typography } from "@mui/material";
import { LabeledIcon } from "../labeled-icon/LabeledIcon";
import PercentOutlinedIcon from '@mui/icons-material/PercentOutlined';
import WhereToVoteOutlinedIcon from '@mui/icons-material/WhereToVoteOutlined';
import { TagComponent } from "../tag/Tag";
import { DisplayMenu } from "../menu/DisplayMenu";
import { Link } from "react-router";
import { DisableSuccessModal } from "../modals/DisableSuccessModal";
import { EnableConfirmationModal } from "../modals/EnableConfirmationModal";
import { EnableSuccessModal } from "../modals/EnableSuccesModal";
import { DisableConfirmationModal } from "../modals/DisableConfirmationModal";


interface SupplyCardProps {
  id?: string,
  code?: string,
  name?: string,
  address?: string,
  partitionCoefficient?: number,
  enabled?: boolean,
  lastConnection?: string,
  lastMeassurement?: number,
  onDisable: (id: string, successCallback: Function) => void,
  onEnable: (id: string, successCallback: Function) => void
}

export const SupplyCard: FC<SupplyCardProps> = ({
  id = "",
  code = "",
  name = "",
  address = "",
  partitionCoefficient = 0,
  enabled = false,
  lastConnection = "",
  lastMeassurement = 0,
  onDisable,
  onEnable
}) => {
  const [openDisableConfirmation, setOpenDisableConfirmation] = useState(false);
  const [openDisableSuccess, setOpenDisableSuccess] = useState(false);
  const [openEnableConfirmation, setOpenEnableConfirmation] = useState(false);
  const [openEnableSuccess, setOpenEnableSuccess] = useState(false);

  const handleCloseDisableConfirmation = (event: React.MouseEvent) => {
    event.preventDefault();
    setOpenDisableConfirmation(false);
  }

  const handleCloseDisableSuccess = (event: React.MouseEvent) => {
    event.preventDefault();
    setOpenDisableSuccess(false);
  }

  const handleDisable = () => {
    setOpenDisableConfirmation(false);
    onDisable(id, () => {
      setOpenDisableSuccess(true)
    });
  }
  
  const handleCloseEnableConfirmation = (event: React.MouseEvent) => {
    event.preventDefault();
    setOpenEnableConfirmation(false);
  }

  const handleCloseEnableSuccess = (event: React.MouseEvent) => {
    event.preventDefault();
    setOpenEnableSuccess(false);
  }

  const handleEnable = () => {
    setOpenEnableConfirmation(false);
    onEnable(id, () => setOpenEnableSuccess(true));
  }

  return <Link to={`/supply-points/${id}`}>
     <CardTemplate className={'grid grid-flow-col grid-cols-5 h-18 items-center justify-items-center md:content-center md:grid-cols-10 gap-4 mt-5'}>
      <Box className="col-span-2 justify-center hidden md:block">
        <Typography className="text-2xl font-semibold">{lastMeassurement} kWh</Typography>
        <Typography className="text-sm text-gray-500 justify-center" >(Hace {lastConnection})</Typography>
      </Box>
      <Box className='col-span-3 md:col-span-3 md:col-start-3 justify-self-start'>
        <Typography className="text-lg font-semibold ml-4 md:ml-0">{name}</Typography>
        <Typography className="text-sm ml-4 md:ml-0">{code}</Typography>
      </Box>
      <Box className='col-span-3 justify-self-start hidden md:block'>
        <LabeledIcon
          icon={WhereToVoteOutlinedIcon}
          iconPosition="left"
          justify="start"
          label={address}
          labelSize="text-sm"

        />
        <LabeledIcon
          icon={PercentOutlinedIcon}
          iconPosition="left"
          justify="start"
          label={partitionCoefficient.toFixed(4)}
          labelSize="text-sm"
        />
      </Box>
      <Box className='justify-self-end md:self-center'>
        <TagComponent
          label={enabled ? 'Activo' : 'Inactivo'}
          className={`w-19 md:w-20 h-6 md:h-8 text-xs md:text-sm leading-6 md:leading-8 flex items-center justify-center mb-2 md:mb-0 text-white 
                ${enabled ? 'bg-green-600' : 'bg-red-600'}`} />
        <Typography className="text-sm text-gray-500 text-center md:hidden">{lastMeassurement} kWh</Typography>
      </Box>
      <Box>
        <DisplayMenu supplyPointId={id} disableSupplyPoint={() => setOpenDisableConfirmation(true)} enableSupplyPoint={() => setOpenEnableConfirmation(true)} enabled={enabled}/>
        <DisableConfirmationModal
          isOpen={openDisableConfirmation}
          code={code}
          onCancel={handleCloseDisableConfirmation}
          onDisable={handleDisable}
        />

        <DisableSuccessModal
          isOpen={openDisableSuccess}
          onClose={handleCloseDisableSuccess}
          code={code}
        />
        <EnableConfirmationModal
          isOpen={openEnableConfirmation}
          code={code}
          onCancel={handleCloseEnableConfirmation}
          onEnable={handleEnable}
        />

        <EnableSuccessModal
          isOpen={openEnableSuccess}
          onClose={handleCloseEnableSuccess}
          code={code}
        />
      </Box>
  </CardTemplate>
    </Link>
}
