import { Box, Typography } from "@mui/material";
import { BreadCrumb } from "../../components/breadCrumb/BreadCrumb";
import { SupportCard } from "../../components/SupportCard/SupportCard";
import type { FC } from "react";

import LocalPhoneIcon from '@mui/icons-material/LocalPhone';
import EmailIcon from '@mui/icons-material/Email';
import PlaceIcon from '@mui/icons-material/Place';

export const ContactPage: FC = () => {
  return (
    <Box className="grid gap-4">
      <BreadCrumb steps={[{ label: 'Contacto', href: '#' }]} />
      <Typography variant="h1" className="text-2xl">Contacto</Typography>
      <SupportCard label="Llámanos" icon={LocalPhoneIcon}>
        <Box className="grid grid-cols-subgrid md:col-span-3">
          <Typography className="opacity-50">Bob - 666777888</Typography>
          <Typography className="opacity-50">John - 666555444</Typography>
          <Typography className="opacity-50">Alice - 666333111</Typography>
        </Box>
      </SupportCard>
      <SupportCard label="Escríbenos" icon={EmailIcon}>
        <Typography className="opacity-50">lucoenergia@gmail.com</Typography>
      </SupportCard>
      <SupportCard label="Dirección"icon={PlaceIcon}>
        <Box>
          <Typography className="opacity-50">Calle False 123</Typography>
          <Typography className="opacity-50">44361 Luco de Jiloca</Typography>
          <Typography className="opacity-50">Teruel</Typography>
        </Box>
      </SupportCard>
    </Box>
  )
}

