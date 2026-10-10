import type { ReactNode } from "react";
import { GlobalStyles, StyledEngineProvider } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "dayjs/locale/es";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CommunityProvider } from "../../src/context/community.context";
import { theme } from "../../src/theme";

// The globals from src/main.tsx that the components rely on: the Inter body
// face, the cascade layer order MUI's enableCssLayer expects, and the motion
// custom properties the hover lifts read.
const GLOBAL_STYLES = `
@layer theme, base, mui, components, utilities;
:root { --motion-lift: -2px; --motion-lift-card: -4px; --motion-nudge: 2px; }
body { font-family: "Inter", sans-serif; }
`;

// No signed-in user is ever provided, so CommunityProvider enables no query and
// nothing reaches the network: confirmation copy falls back to "la comunidad
// activa". The client exists only because those hooks require one.
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } });

export interface ConluzProviderProps {
  children?: ReactNode;
  /** Initial location for components that read the router (links, breadcrumbs, side menu). */
  initialPath?: string;
}

/**
 * Root wrapper every Conluz component needs: the MUI theme (palette, typography,
 * Spanish locale), the date-picker locale, the global styles from the app shell,
 * an in-memory router so components that render links work outside the app, and
 * an inert query client + community context for the confirmation dialogs.
 */
export function ConluzProvider({ children, initialPath = "/" }: ConluzProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <CommunityProvider>
        <ThemeProvider theme={theme}>
          <StyledEngineProvider enableCssLayer>
            <GlobalStyles styles={GLOBAL_STYLES} />
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
              <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
            </LocalizationProvider>
          </StyledEngineProvider>
        </ThemeProvider>
      </CommunityProvider>
    </QueryClientProvider>
  );
}
