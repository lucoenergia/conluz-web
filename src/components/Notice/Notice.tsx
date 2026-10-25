import type { FC } from "react";
import { Alert, type AlertProps } from "@mui/material";

export interface NoticeProps extends Omit<AlertProps, "role"> {
  /**
   * The note appears as the result of something the user just did, and is
   * announced politely (`role="status"`). Leave it off for guidance that is
   * simply part of the view (`role="note"`), which is read in place and never
   * announced.
   */
  announce?: boolean;
}

/**
 * An informational note: a guide, an explanation, a consequence, or the result
 * of an action. It looks like an `Alert` of the same severity, but is not
 * announced as one.
 *
 * MUI gives every `Alert` `role="alert"`, which a screen reader announces at
 * once, interrupting whatever is being read (#310). That is right for an error
 * or a warning the user must act on now, which stay a plain `Alert`; it is
 * noise for everything else.
 */
export const Notice: FC<NoticeProps> = ({ announce = false, ...props }) => (
  <Alert role={announce ? "status" : "note"} {...props} />
);
