import type { FC, ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { DesktopDatePicker } from "@mui/x-date-pickers/DesktopDatePicker";
import dayjs, { type Dayjs } from "dayjs";
import { sxStyles } from "../../../theme/sx";
import { colors, fontSizes } from "../../../theme/tokens";

export type FlowStep = "dates" | "preview" | "result";

const STEPS: { step: FlowStep; label: string }[] = [
  { step: "dates", label: "Fechas" },
  { step: "preview", label: "Vista previa" },
  { step: "result", label: "Resultado" },
];

/** "1 Fechas — 2 Vista previa — 3 Resultado", the current one marked for assistive technology too. */
export const StepIndicator: FC<{ current: FlowStep }> = ({ current }) => {
  const currentIndex = STEPS.findIndex(({ step }) => step === current);
  return (
    <Box
      component="ol"
      aria-label="Pasos"
      sx={{ listStyle: "none", m: 0, p: 0, display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 } }}
    >
      {STEPS.map(({ step, label }, index) => {
        const isCurrent = index === currentIndex;
        const isDone = index < currentIndex;
        return (
          <Box
            component="li"
            key={step}
            aria-current={isCurrent ? "step" : undefined}
            sx={{ display: "flex", alignItems: "center", gap: 1, flex: index < STEPS.length - 1 ? 1 : "0 0 auto", minWidth: 0 }}
          >
            <Box
              aria-hidden
              sx={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: fontSizes.md,
                fontWeight: 700,
                bgcolor: isCurrent || isDone ? "primary.main" : colors.background.paper,
                color: isCurrent || isDone ? colors.brand.contrastText : colors.text.subtle,
                border: isCurrent || isDone ? "none" : `1px solid ${colors.border.light}`,
              }}
            >
              {index + 1}
            </Box>
            <Typography
              sx={{
                fontSize: { xs: fontSizes.sm, sm: fontSizes.lg },
                fontWeight: isCurrent ? 700 : 500,
                color: isCurrent ? colors.text.primary : colors.text.subtle,
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </Typography>
            {index < STEPS.length - 1 && (
              <Box aria-hidden sx={{ flex: 1, height: "1px", bgcolor: colors.border.light, minWidth: 12 }} />
            )}
          </Box>
        );
      })}
    </Box>
  );
};

/**
 * The step's actions. On a phone it sticks to the bottom of the viewport, so
 * the action is in reach however long the list above it is (#419); from `md`
 * up it closes the page like any other panel.
 */
export const FlowActionBar: FC<{ reason?: ReactNode; reasonId?: string; children: ReactNode }> = ({
  reason,
  reasonId,
  children,
}) => (
  <Box
    sx={{
      ...sxStyles.pageContainer,
      position: { xs: "sticky", md: "static" },
      bottom: 0,
      zIndex: (theme) => theme.zIndex.appBar - 1,
    }}
  >
    <Box
      sx={{
        ...sxStyles.softPanel,
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        alignItems: { xs: "stretch", md: "center" },
        justifyContent: "flex-end",
        gap: { xs: 1.25, md: 2 },
        borderTop: { xs: `1px solid ${colors.divider}`, md: "none" },
        paddingBottom: { xs: "calc(16px + env(safe-area-inset-bottom))", md: undefined },
      }}
    >
      {reason && (
        <Typography id={reasonId} variant="body2" sx={{ color: colors.text.body, mr: { md: "auto" }, textWrap: "pretty" }}>
          {reason}
        </Typography>
      )}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column-reverse", md: "row" },
          gap: { xs: 1, md: 1.5 },
          "& > *": { width: { xs: "100%", md: "auto" } },
        }}
      >
        {children}
      </Box>
    </Box>
  </Box>
);

/**
 * A day field: typed or picked, never a day after today. The picker opens in
 * place (UI-OVL-011 does not apply off an overlay, but a page needs no second
 * layer either). A typed day the picker refuses is reported through
 * `onError`, so it is validated even when it bypasses `maxDate`.
 */
export const DayField: FC<{
  label: string;
  value: Dayjs | null;
  onChange: (value: Dayjs | null) => void;
  onError: (error: string | null) => void;
  disabled?: boolean;
  readOnly?: boolean;
  helperText?: ReactNode;
  error?: boolean;
  /** Shows the label inside the field; otherwise it names the field for assistive technology only. */
  visibleLabel?: boolean;
}> = ({ label, value, onChange, onError, disabled, readOnly, helperText, error, visibleLabel = false }) => (
  <DesktopDatePicker
    label={visibleLabel ? label : undefined}
    value={value}
    onChange={onChange}
    onError={(reason) => onError(reason)}
    maxDate={dayjs()}
    disabled={disabled}
    readOnly={readOnly}
    slotProps={{
      textField: {
        size: "small",
        fullWidth: true,
        helperText,
        error,
        // Names the field's group, the element the date sections sit in.
        InputProps: visibleLabel ? undefined : { "aria-label": label },
      },
    }}
  />
);
