import type { FC } from "react";
import { BasicModal } from "./BasicModal";
import { Box, Button, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

interface DisableSuccessModalProps {
  onClose: (event: React.MouseEvent<HTMLElement>) => void;
  isOpen: boolean;
  code: string;
}

export const DisableSuccessModal: FC<DisableSuccessModalProps> = ({ onClose, isOpen, code }) => {
  return (
    <BasicModal isOpen={isOpen} onClose={onClose}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          p: { xs: 2, sm: 3 },
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 3,
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 40, color: "#10b981" }} />
        </Box>
        <Typography
          sx={{
            fontFamily: "Inter, sans-serif",
            fontSize: "1.125rem",
            color: "#475569",
            lineHeight: 1.6,
            mb: 2,
          }}
        >
          El punto de suministro
        </Typography>
        <Typography
          sx={{
            fontFamily: "Inter, sans-serif",
            fontSize: "0.9375rem",
            fontWeight: 600,
            color: "#1e293b",
            mb: 2,
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            padding: "10px 16px",
            borderRadius: "6px",
          }}
        >
          {code}
        </Typography>
        <Typography
          sx={{
            fontFamily: "Inter, sans-serif",
            fontSize: "1.125rem",
            color: "#475569",
            lineHeight: 1.6,
            mb: 3,
          }}
        >
          ha sido deshabilitado
        </Typography>
        <Button
          variant="contained"
          onClick={onClose}
          sx={{
            textTransform: "none",
            minWidth: "120px",
            padding: "8px 24px",
            fontFamily: "Inter, sans-serif",
            fontSize: "0.9375rem",
            borderRadius: "6px",
            transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
            backgroundColor: "#667eea",
            color: "white",
            boxShadow: "0 2px 4px 0 rgba(0,0,0,0.12)",
            "&:hover": {
              backgroundColor: "#5568d3",
              boxShadow: "0 4px 8px 0 rgba(0,0,0,0.16)",
            },
          }}
        >
          Cerrar
        </Button>
      </Box>
    </BasicModal>
  );
};
