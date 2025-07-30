import { Box, Container } from "@mui/material";
import { type FC } from "react";
import { Outlet } from "react-router";
import { Logo } from "../components/header/Logo";
import { AnonRoute } from "../components/auth/AnonRoute";


export const LoginLayout: FC = () => {

  return <AnonRoute>
    <Container className="w-screen h-screen grid justify-center  md:items-center p-0 m-0 max-w-screen" >
      <Box className="grid justify-items-center content-center gap-16 md:gap-4 py-2 md:py-4 w-screen md:w-lg  bg-white md:shadow-xl">
        <Logo></Logo>
        <Outlet></Outlet>
      </Box>
    </Container>
  </AnonRoute>
}
