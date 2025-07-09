import { Box, Container } from "@mui/material";
import { type FC } from "react";
import { Outlet } from "react-router";
import { Logo } from "../components/header/Logo";
import { MIN_DESKTOP_WIDTH } from "../utils/constants";
import useWindowDimensions from "../utils/useWindowDimensions";


export const LoginLayout: FC = () => {
const { width } = useWindowDimensions();
const desktopWidth = width > MIN_DESKTOP_WIDTH || width === MIN_DESKTOP_WIDTH;
    
return <Container maxWidth='sm'sx={{height: desktopWidth ? '75%' : '100%'}}>        
        <Box sx={{bgcolor: 'primary.main'}} className="flex flex-col items-center gap-4 py-4">
            <Logo></Logo>
            <Outlet></Outlet>
        </Box>
    </Container>  
}