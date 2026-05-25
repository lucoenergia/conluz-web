import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { BrowserRouter } from "react-router";
import { CssBaseline, GlobalStyles, StyledEngineProvider } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/auth.context.tsx";
import { LoggedUserProvider } from "./context/logged-user.context.tsx";
import { getFromStorage } from "./utils/getFromStorage.tsx";
import { theme } from "./theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      throwOnError: (error: any) => error.response?.status === 401,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider initialState={getFromStorage("token")}>
      <LoggedUserProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <StyledEngineProvider enableCssLayer>
              <GlobalStyles styles="@layer theme, base, mui, components, utilities;" />
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </StyledEngineProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </LoggedUserProvider>
    </AuthProvider>
  </StrictMode>,
);
