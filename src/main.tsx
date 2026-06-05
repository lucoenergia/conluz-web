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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider initialState={getFromStorage("token")}>
      <LoggedUserProvider>
        <CommunityProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
              <StyledEngineProvider enableCssLayer>
                <GlobalStyles styles={`@layer theme, base, mui, components, utilities; body { font-family: "Inter", sans-serif; }`} />
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
