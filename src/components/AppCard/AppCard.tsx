import type { FC, ReactNode } from "react";
import { Card, Box, type CardProps } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { radii } from "../../theme/tokens";

interface AppCardProps extends Omit<CardProps, "children"> {
  children: ReactNode;
  /** Optional colored-header slot — rendered on primary.main background, white text */
  header?: ReactNode;
}

export const AppCard: FC<AppCardProps> = ({ children, header, sx, ...rest }) => {
  const theme = useTheme();
  return (
    <Card
      sx={{
        width: "100%",
        borderRadius: radii.default,
        overflow: "hidden",
        // Intentionally heavier than shadows.soft for data cards
        boxShadow: "0 4px 20px 0 rgba(0,0,0,0.12)",
        transition: "all 0.3s ease",
        "&:hover": {
          boxShadow: "0 6px 24px 0 rgba(0,0,0,0.15)",
        },
        ...sx,
      }}
      {...rest}
    >
      {header && (
        <Box
          sx={{
            background: theme.palette.primary.main,
            color: "white",
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {header}
        </Box>
      )}
      {children}
    </Card>
  );
};
