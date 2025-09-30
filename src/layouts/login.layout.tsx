import { Box, Container } from "@mui/material";
import { type FC } from "react";
import { Outlet } from "react-router";
import { Logo } from "../components/Header/Logo";
import { AnonRoute } from "../components/Auth/AnonRoute";

export const LoginLayout: FC = () => {
  return (
    <AnonRoute>
      <Container className="w-screen h-screen grid justify-center items-start p-0 m-0 max-w-screen">
        <Box className="grid justify-items-center content-start gap-3 md:gap-4 py-2 md:py-4 w-screen md:w-lg">
          <Logo></Logo>
          <Outlet></Outlet>
        </Box>
      </Container>
    </AnonRoute>
  );
};
