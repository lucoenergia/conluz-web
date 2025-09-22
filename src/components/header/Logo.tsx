import { Box, Typography } from "@mui/material";
import type { FC } from "react";

interface LogoProps {
  responsive?: boolean;
}

export const Logo: FC<LogoProps> = ({ responsive: hide = false }) => {
  return (
    <Box className="grid grid-flow-col items-center gap-2 grow justify-items-center md:justify-start">
      <img className="w-[50px]" src="/favicon.png" />
      <Typography className={`text-2xl! bold ${hide ? "hidden md:inline" : ""}`}>ConLuz</Typography>
    </Box>
  );
};
