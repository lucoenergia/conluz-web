import { Typography } from "@mui/material";
import type { FC } from "react";
import { PASSWORD_POLICY_EXAMPLE, PASSWORD_POLICY_TEXT } from "../../utils/passwordPolicy";

interface PasswordPolicyHintProps {
  /** Referenced by the new-password field's `aria-describedby`, so a screen reader reads the policy with it. */
  id: string;
}

/**
 * The password policy as visible text, with a passphrase example (#196).
 * Shown wherever a new password is chosen, before anything is submitted.
 */
export const PasswordPolicyHint: FC<PasswordPolicyHintProps> = ({ id }) => (
  <Typography id={id} variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
    {PASSWORD_POLICY_TEXT} Por ejemplo: «{PASSWORD_POLICY_EXAMPLE}».
  </Typography>
);
