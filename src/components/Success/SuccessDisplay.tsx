import type { FC } from "react";
import { useSuccess } from "../../context/success.context";
import { Alert, Box, Slide, Snackbar } from "@mui/material";

export const SuccessDisplay: FC = () => {
  const messages = useSuccess();
  return (
    <Box sx={{ position: "fixed", top: 0, left: 0, right: 0, display: "grid", gap: 2 }}>
      {messages?.map((message, index) => (
        <Snackbar
          key={index}
          open={message !== null}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          slots={{ transition: Slide }}
        >
          <Alert severity="success">{message}</Alert>
        </Snackbar>
      ))}
    </Box>
  );
};
