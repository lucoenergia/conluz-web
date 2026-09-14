import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { BrowserRouter } from "react-router";
import { GlobalStyles, StyledEngineProvider } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/auth.context.tsx";
import { LoggedUserProvider } from "./context/logged-user.context.tsx";
import { CommunityProvider } from "./context/community.context.tsx";
import { getFromStorage } from "./utils/getFromStorage.tsx";
import { theme } from "./theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      throwOnError: (error: unknown) => (error as { response?: { status?: number } }).response?.status === 401,
    },
  },
});

/**
 * Motion distances live as custom properties so the reduced-motion rule below
 * can flatten them in one place, without every hover rule having to know.
 *
 * Reduced motion is not "no motion". The colour, border and shadow transitions
 * are what tell someone their click registered, and a blanket
 * `animation: none; transition: 0.01ms` — the usual reflex — would delete that
 * feedback along with the movement. So this removes SPATIAL travel and keeps
 * everything that carries state:
 *
 *   - hover lifts collapse to zero; the shadow and colour change still runs
 *   - overlays stop scaling in and simply fade, which still says "this appeared"
 *   - overlay and drawer timings shorten rather than snap, preserving the sense
 *     that one thing came from another
 *   - the content shift when the sidebar toggles becomes instant
 *   - the loading spinner keeps turning; it is the only signal that work is in
 *     flight, and stopping it would remove information rather than movement
 *
 * Deliberately untouched: the little rotated square that forms the arrow on
 * menu popovers. That transform is static geometry, not animation — flattening
 * it would break the shape rather than calm it.
 */
const GLOBAL_STYLES = `
@layer theme, base, mui, components, utilities;

:root {
  --motion-lift: -2px;
  --motion-lift-card: -4px;
  --motion-nudge: 2px;
}

body { font-family: "Inter", sans-serif; }

@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-lift: 0px;
    --motion-lift-card: 0px;
    --motion-nudge: 0px;
  }

  /* Arrive at full size and fade instead of scaling up. Not applied to
     .MuiDrawer-paper: its transform IS its closed position, and neutralising
     that would leave the drawer permanently open. */
  .MuiDialog-paper,
  .MuiPopover-paper,
  .MuiMenu-paper,
  .MuiTooltip-tooltip {
    transform: none !important;
  }

  .MuiBackdrop-root,
  .MuiDialog-paper,
  .MuiPopover-paper,
  .MuiMenu-paper,
  .MuiDrawer-paper,
  .MuiCollapse-root,
  .MuiSnackbar-root,
  .MuiTooltip-tooltip {
    transition-duration: 120ms !important;
  }

  /* The main content slides sideways when the sidebar opens. Go straight
     there. */
  main {
    transition: none !important;
  }
}
`;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider initialState={getFromStorage("token")}>
      <LoggedUserProvider>
        <CommunityProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
              <StyledEngineProvider enableCssLayer>
                <GlobalStyles styles={GLOBAL_STYLES} />
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </StyledEngineProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </CommunityProvider>
      </LoggedUserProvider>
    </AuthProvider>
  </StrictMode>,
);
