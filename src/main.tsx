import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router'
import { createTheme, GlobalStyles, StyledEngineProvider } from '@mui/material'
import { ThemeProvider } from '@emotion/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './api/auth.context.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      throwOnError: (error: any) => error.response?.status === 401
    }
  }
});


const theme = createTheme({
  palette: {
    primary: {
      main: "#eeaf11",
      light: "#f2d152",
      dark: "#ed8d06",
      contrastText: "#fff"
    }
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider initialState={window.localStorage.getItem('token')}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <StyledEngineProvider enableCssLayer>
            <GlobalStyles styles="@layer theme, base, mui, components, utilities;" />
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </StyledEngineProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  </StrictMode>,
)
