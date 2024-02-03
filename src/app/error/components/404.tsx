"use client";

// ** Next Import
import Link from "next/link";

// ** MUI Components
import Button from "@mui/material/Button";
import { styled } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import Box, { BoxProps } from "@mui/material/Box";
import { Grid } from "@mui/material";

// ** Demo Imports
import FooterIllustrations from "@/app/shared/components/footer-illustrations/misc/FooterIllustrations";

// ** Styled Components
const BoxWrapper = styled(Box)<BoxProps>(({ theme }) => ({
  [theme.breakpoints.down("md")]: {
    width: "90vw",
  },
}));

const Img = styled("img")(({ theme }) => ({
  marginBottom: theme.spacing(10),
  [theme.breakpoints.down("lg")]: {
    height: 450,
    marginTop: theme.spacing(10),
  },
  [theme.breakpoints.down("md")]: {
    height: 400,
  },
  [theme.breakpoints.up("lg")]: {
    marginTop: theme.spacing(13),
  },
}));

const TreeIllustration = styled("img")(({ theme }) => ({
  left: 0,
  bottom: "5rem",
  position: "absolute",
  [theme.breakpoints.down("lg")]: {
    bottom: 0,
  },
}));

const Error404 = () => {
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
        <BoxWrapper>
          <Typography
            variant="h5"
            sx={{ mb: 1, fontSize: "1.5rem !important" }}
          >
            Oops parece que te has perdido ⚠️
          </Typography>
          <Typography variant="body2">
            ¡La página a la que has intentado acceder no existe! Vuelve a la
            página principal o accede a la sección "Contacto" para solicitar más
            información
          </Typography>
        </BoxWrapper>
        <Img
          height="487"
          alt="error-illustration"
          src="/images/pages/404.png"
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
              sx={{ px: 5.5, width: { xs: "60vw", sm: "auto" } }}
            >
              Volver a la página principal
            </Button>
          </Grid>
          <Grid item xs={6} sm={4} md={4}>
            <Button
              href="/help"
              component={Link}
              variant="contained"
              sx={{ px: 5.5, width: { xs: "60vw", sm: "auto" } }}
            >
              Ir a la página de contacto
            </Button>
          </Grid>
        </Grid>
      </Box>
      <FooterIllustrations
        image={<TreeIllustration alt="tree" src="/images/pages/tree.png" />}
      />
    </Box>
  );
};

export default Error404;
