"use client";

// ** Next Import
import Link from "next/link";

// ** MUI Components
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { Grid } from "@mui/material";

// ** Styled Components
import * as Styled from "./401.styles";

const Error401 = () => {
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
            Página con acceso restringido 🔐
          </Typography>
          <Typography variant="body1">
            ¡Lo sentimos, no tienes los permisos necesarios para ver esta
            página! <br /> Por favor, inicia sesión con las credenciales
            adecuadas o contacta con el administrador si crees que deberías
            tener acceso.
          </Typography>
        </Styled.BoxWrapper>
        <Styled.Img
          height="487"
          alt="error-illustration"
          src="/images/pages/401.png"
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
        </Grid>
      </Box>
    </Box>
  );
};

export default Error401;
