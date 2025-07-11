import { Box, Typography } from "@mui/material";
import type { FC } from "react";

export const Logo: FC = () => {
  return <Box className="grid grid-flow-col items-center gap-2 grow justify-items-center md:justify-start">
    <img className="w-[50px]" src="/favicon.png" />
    <Typography className="text-2xl! bold hidden md:inline">ConLuz</Typography>
  </Box>
}
