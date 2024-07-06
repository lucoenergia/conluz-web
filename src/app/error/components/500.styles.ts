// ** MUI Components
import { styled } from "@mui/material/styles";
import Box, { BoxProps } from "@mui/material/Box";

// ** Styled Components
export const BoxWrapper = styled(Box)<BoxProps>(({ theme }) => ({
  [theme.breakpoints.down("md")]: {
    width: "90vw",
  },
}));

export const Img = styled("img")(({ theme }) => ({
  marginBottom: theme.spacing(10),
  [theme.breakpoints.down("lg")]: {
    height: 250,
    marginTop: theme.spacing(5),
  },
  [theme.breakpoints.down("md")]: {
    height: 300,
  },
  [theme.breakpoints.up("lg")]: {
    marginTop: theme.spacing(5),
    height: 500,
  },
}));

export const TreeIllustration = styled("img")(({ theme }) => ({
  left: 0,
  bottom: "5rem",
  position: "absolute",
  [theme.breakpoints.down("lg")]: {
    bottom: 0,
  },
}));
