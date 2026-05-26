import type { FC, ReactNode } from "react";
import { Card, Box, type CardProps } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { radii, shadows } from "../../theme/tokens";

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
        boxShadow: shadows.dataCard,
        transition: "all 0.3s ease",
        "&:hover": {
          boxShadow: shadows.dataCardHover,
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
