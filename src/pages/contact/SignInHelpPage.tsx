import type { FC } from "react";
import { Link as RouterLink } from "react-router";
import { Box, Link, Paper, Typography } from "@mui/material";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";
import { ContactInstruction } from "./ContactInstruction";
import { OperatorContact } from "./OperatorContact";
import { useOperatorContact } from "./useOperatorContact";

/**
 * Help for someone who cannot sign in (#295). The platform cannot know their
 * community, so it reads nothing about one: whoever manages it comes first, then
 * password recovery, and the operator only last, when one is configured.
 */
export const SignInHelpPage: FC = () => {
  const operator = useOperatorContact(true);

  return (
    <Box sx={{ maxWidth: 560, mx: "auto", py: { xs: 2, sm: 4 } }}>
      <Paper elevation={0} sx={{ ...sxStyles.softPanel, display: "flex", flexDirection: "column", gap: 3 }}>
        <Typography variant="h4" component="h1" sx={{ color: colors.text.primary }}>
          ¿No puedes acceder?
        </Typography>
        <ContactInstruction />
        <Typography variant="body1" sx={{ color: colors.text.body }}>
          Si has olvidado tu contraseña, puedes recuperarla desde{" "}
          <Link component={RouterLink} to="/forgot-password" underline="hover" sx={{ fontWeight: 600 }}>
            «¿Olvidaste tu contraseña?»
          </Link>{" "}
          si tu cuenta tiene un email asociado.
        </Typography>
        {operator && <OperatorContact contact={operator} />}
        <Link component={RouterLink} to="/login" underline="hover" sx={{ alignSelf: "flex-start", fontWeight: 600 }}>
          Volver a iniciar sesión
        </Link>
      </Paper>
    </Box>
  );
};
