import type { FC } from "react";
import { BasicModal } from "./BasicModal";
import { Box, Button, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { radii, shadows } from "../../theme/tokens";

interface DisablePartnerSuccessModalProps {
  onClose: (event: React.MouseEvent<HTMLElement>) => void;
  isOpen: boolean;
  partnerName: string;
  wasEnabled?: boolean;
}

export const DisablePartnerSuccessModal: FC<DisablePartnerSuccessModalProps> = ({ onClose, isOpen, partnerName, wasEnabled = false }) => {
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
            fontSize: "1.125rem",
            color: "#475569",
            lineHeight: 1.6,
            mb: 2,
          }}
        >
          El acceso a la plataforma de
        </Typography>
        <Typography
          sx={{
            fontSize: "0.9375rem",
            fontWeight: 600,
            color: "#1e293b",
            mb: 2,
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            padding: "10px 16px",
            borderRadius: radii.default,
          }}
        >
          {partnerName}
        </Typography>
        <Typography
          sx={{
            fontSize: "1.125rem",
            color: "#475569",
            lineHeight: 1.6,
            mb: 3,
          }}
        >
          ha sido {wasEnabled ? "habilitado" : "deshabilitado"}
        </Typography>
        <Button
          variant="contained"
          onClick={onClose}
          sx={{
            textTransform: "none",
            minWidth: "120px",
            padding: "8px 24px",

            fontSize: "0.9375rem",
            borderRadius: radii.default,
            transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
            backgroundColor: (theme) => theme.palette.primary.main,
            color: "white",
            boxShadow: shadows.medium,
            "&:hover": {
              backgroundColor: (theme) => theme.palette.primary.dark,
              boxShadow: shadows.strong,
            },
          }}
        >
          Cerrar
        </Button>
      </Box>
    </BasicModal>
  );
};
