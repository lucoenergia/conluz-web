import { Box, Container } from "@mui/material";
import { type FC } from "react";
import { Outlet } from "react-router";
import { Logo } from "../components/header/Logo";


export const LoginLayout: FC = () => {
    
return <Container className="w-screen h-screen grid justify-center md:items-center p-0 m-0 " >        
        <Box className="grid justify-items-center gap-2 md:gap-4 py-2 md:py-4 md:w-lg md:min-h-[580px] bg-white md:shadow-xl">
            <Logo></Logo>
            <Outlet></Outlet>
        </Box>
    </Container>  
}