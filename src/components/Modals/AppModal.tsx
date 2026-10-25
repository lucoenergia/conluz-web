import { useId, type FC, type ReactNode, type SyntheticEvent } from "react";
import { Box, Typography } from "@mui/material";
import { BasicModal } from "./BasicModal";

/**
 * How the dialog is named: by the `title` this modal renders; when the
 * content renders its own heading, by that heading's id; or, when no heading
 * stays on screen throughout, by a `label`. A modal with none of them does not
 * compile (`AppModal.typecheck.ts`).
 */
type AppModalName =
  | { title: string; labelledBy?: never; label?: never }
  | { title?: undefined; labelledBy: string; label?: never }
  | { title?: undefined; labelledBy?: never; label: string };

export type AppModalProps = AppModalName & {
  isOpen: boolean;
  /** Called on Escape and on a backdrop click (`BasicModal`). */
  onClose: (event: SyntheticEvent) => void;
  /** Rendered above the title, e.g. the community a confirmed write lands in. */
  scopeHeader?: ReactNode;
  icon?: ReactNode;
  iconBg?: string;
  iconSize?: number;
  centered?: boolean;
  actions?: ReactNode;
  children?: ReactNode;
};

export const AppModal: FC<AppModalProps> = ({
  isOpen,
  onClose,
  title,
  labelledBy,
  label,
  scopeHeader,
  icon,
  iconBg,
  iconSize,
  centered = false,
  actions,
  children,
}) => {
  const circleSize = iconSize ?? (centered ? 64 : 48);
  const titleId = useId();
  const name = label !== undefined ? { label } : { labelledBy: labelledBy ?? titleId };

  if (centered) {
    return (
      <BasicModal isOpen={isOpen} onClose={onClose} {...name}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            p: { xs: 2, sm: 3 },
          }}
        >
          {scopeHeader}
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
          {title && (
            <Typography id={titleId} variant="h6" component="h2" sx={{ color: "text.primary", mb: 2 }}>
              {title}
            </Typography>
          )}
          {children}
          {actions}
        </Box>
      </BasicModal>
    );
  }

  return (
    <BasicModal isOpen={isOpen} onClose={onClose} {...name}>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {scopeHeader}
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
                  id={titleId}
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
