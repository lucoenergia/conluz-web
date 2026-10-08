import { Box, Container } from "@mui/material";
import { Suspense, type FC } from "react";
import { Outlet } from "react-router";
import { Logo } from "../components/Header/Logo";
import { AnonRoute } from "../components/Auth/AnonRoute";
import { RouteFallback } from "../components/RouteFallback";

interface LoginLayoutProps {
  /**
   * Serves the pages to a caller who still holds a session instead of sending
   * them to "/". Only for the password-recovery pages (#233): the emailed reset
   * link carries its token in the URL, and a redirect would lose it. The login
   * page itself keeps the redirect.
   */
  allowSignedIn?: boolean;
}

export const LoginLayout: FC<LoginLayoutProps> = ({ allowSignedIn = false }) => {
  const content = (
    <Container sx={{ width: '100vw', height: '100vh', display: 'grid', justifyContent: 'center', alignItems: 'flex-start', p: 0, m: 0, maxWidth: '100vw !important' }}>
      <Box sx={{ display: 'grid', justifyItems: 'center', alignContent: 'flex-start', gap: { xs: 1.5, sm: 2 }, py: { xs: 1, sm: 2 }, width: { xs: '100vw', sm: '512px' } }}>
        <Logo></Logo>
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </Box>
    </Container>
  );
  return allowSignedIn ? content : <AnonRoute>{content}</AnonRoute>;
};
