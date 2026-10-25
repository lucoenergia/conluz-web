import type { FC } from "react";
import { useSuccess } from "../../context/success.context";
import { Box, Slide, Snackbar } from "@mui/material";
import { Notice } from "../Notice";
import { ActionStatus } from "../ActionStatus";

export const SuccessDisplay: FC = () => {
  const messages = useSuccess();
  return (
    <Box sx={{ position: "fixed", top: 0, left: 0, right: 0, display: "grid", gap: 2 }}>
      {/* Mounted with the provider, before any message: the latest one is
          announced politely, since a confirmation should not interrupt what is
          being read. The toasts are only read in place. Errors keep the
          assertive default (ErrorDisplay). */}
      <ActionStatus message={messages?.at(-1) ?? ""} />
      {messages?.map((message, index) => (
        <Snackbar
          key={index}
          open={message !== null}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          slots={{ transition: Slide }}
        >
          <Notice severity="success">{message}</Notice>
        </Snackbar>
      ))}
    </Box>
  );
};
