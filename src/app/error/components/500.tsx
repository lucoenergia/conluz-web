"use client";

// ** Next Import
import Link from "next/link";

// ** MUI Components
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { Grid } from "@mui/material";

// ** Styled Components
import * as Styled from "./500.styles";

const Error500 = () => {
  return (
    <Box className="content-center">
      <Box
        sx={{
          p: 5,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <Styled.BoxWrapper>
          <Typography
            variant="h1"
            sx={{
              mb: 2.5,
              fontSize: { md: "2rem !important", xs: "1.5rem !important" },
            }}
          >
            No se ha podido procesar tu petición
          </Typography>
          <Typography variant="body1">
            Lo sentimos, no hemos podido procesar tu petición correctamente. Por
            favor, vuelve a intentarlo más tarde. Si el problema persiste,
            contáctanos.
          </Typography>
        </Styled.BoxWrapper>
        <Styled.Img
          height="487"
          alt="error-illustration"
          src="/images/pages/500.png"
        />
        <Grid
          container
          spacing={{ xs: 2, md: 2 }}
          columns={{ xs: 2, sm: 8, md: 12 }}
          justifyContent="center"
        >
          <Grid item xs={6} sm={4} md={4}>
            <Button
              href="/dashboard"
              component={Link}
              variant="contained"
              sx={{
                px: 5.5,
                width: { xs: "60vw", sm: "auto" },
                fontWeight: "bold",
              }}
            >
              Volver a la página principal
            </Button>
          </Grid>
          <Grid item xs={6} sm={4} md={4}>
            <Button
              href="/help"
              component={Link}
              variant="contained"
              sx={{
                px: 5.5,
                width: { xs: "60vw", sm: "auto" },
                fontWeight: "bold",
              }}
            >
              Ir a la página de contacto
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default Error500;
