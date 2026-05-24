import * as React from "react";
import type { FC, ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { BasicModal } from "./BasicModal";

interface AppModalProps {
  isOpen: boolean;
  onClose: (event: React.MouseEvent<HTMLElement>) => void;
  title?: string;
  icon?: ReactNode;
  iconBg?: string;
  iconSize?: number;
  centered?: boolean;
  actions?: ReactNode;
  children?: ReactNode;
}

export const AppModal: FC<AppModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  iconBg,
  iconSize,
  centered = false,
  actions,
  children,
}) => {
  const circleSize = iconSize ?? (centered ? 64 : 48);

  if (centered) {
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
          {icon && (
            <Box
              sx={{
                width: circleSize,
                height: circleSize,
                borderRadius: "50%",
                backgroundColor: iconBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 3,
              }}
            >
              {icon}
            </Box>
          )}
          {children}
          {actions}
        </Box>
      </BasicModal>
    );
  }

  return (
    <BasicModal isOpen={isOpen} onClose={onClose}>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {(icon || title) && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            {icon && (
              <Box
                sx={{
                  width: circleSize,
                  height: circleSize,
                  borderRadius: "50%",
                  backgroundColor: iconBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {icon}
              </Box>
            )}
            {title && (
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="h6"
                  component="h2"
                  sx={{ color: "text.primary" }}
                >
                  {title}
                </Typography>
              </Box>
            )}
          </Box>
        )}
        {children}
      </Box>
      {actions && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 2,
            pt: 3,
            px: { xs: 2, sm: 3 },
            pb: { xs: 2, sm: 3 },
          }}
        >
          {actions}
        </Box>
      )}
    </BasicModal>
  );
};
