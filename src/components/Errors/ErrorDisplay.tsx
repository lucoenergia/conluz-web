import type { FC } from "react";
import { useError } from "../../context/error.context";
import { Alert, Box, Slide, Snackbar } from "@mui/material";

export const ErrorDisplay: FC = () => {
  const errors = useError()
  return (
    <Box className="fixed bottom-0 right-0 bg-red grid gap-2">
      { errors?.map((error, index) => (
        <Snackbar key={index} className="relative" open={error !== null} anchorOrigin={{ vertical: 'bottom', horizontal: 'right'}} slots={{ transition: Slide}}>
          <Alert severity="error">{ error }</Alert>          
        </Snackbar>
      ))}
    </Box>
  )
}
