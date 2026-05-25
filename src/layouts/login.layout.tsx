import { Box, Container } from "@mui/material";
import { type FC } from "react";
import { Outlet } from "react-router";
import { Logo } from "../components/Header/Logo";
import { AnonRoute } from "../components/Auth/AnonRoute";

export const LoginLayout: FC = () => {
  return (
    <AnonRoute>
      <Container sx={{ width: '100vw', height: '100vh', display: 'grid', justifyContent: 'center', alignItems: 'flex-start', p: 0, m: 0, maxWidth: '100vw !important' }}>
        <Box sx={{ display: 'grid', justifyItems: 'center', alignContent: 'flex-start', gap: { xs: 1.5, sm: 2 }, py: { xs: 1, sm: 2 }, width: { xs: '100vw', sm: '512px' } }}>
          <Logo></Logo>
          <Outlet></Outlet>
        </Box>
      </Container>
    </AnonRoute>
  );
};
