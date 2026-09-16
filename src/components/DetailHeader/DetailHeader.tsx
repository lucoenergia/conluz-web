import { useCallback, useEffect, useId, useRef, useState, type FC, type ReactNode, type Ref } from "react";
import { Box, Button, Collapse, IconButton, Paper, Typography, useMediaQuery, useTheme } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import { colors, radii } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { ActionStatus } from "../ActionStatus";

// ─── DetailHeader ────────────────────────────────────────────────────────────
// Shared header for entity detail pages, in two clearly separated levels: an
// identity row saying who the entity is, and below it a strip of key-fact cells
// whose last cell is the details toggle itself — so disclosing the rest never
// adds a row. Collapsed, it fits inside a 390px first viewport.

/** How long the copy button shows its confirmation before reverting. */
const COPY_FEEDBACK_MS = 2000;

/**
 * A 44px touch target that costs no vertical space.
 *
 * The theme grows every small control to 44px DRAWN under a coarse pointer,
 * which is right almost everywhere and wrong here: these two controls sit in a
 * strip whose whole purpose is to keep the collapsed header inside a phone's
 * first viewport, and they were setting its row height. `coarseHitArea` makes
 * the same trade the breadcrumb links make — the drawn size stays deliberate,
 * an absolutely-positioned overlay carries the finger target — so the theme's
 * minimums are cleared inside the very media query that would apply them.
 */
const stripHitArea = {
  ...sxStyles.coarseHitArea,
  "@media (pointer: coarse)": {
    ...sxStyles.coarseHitArea["@media (pointer: coarse)"],
    minWidth: 0,
    minHeight: 0,
  },
} as const;

export interface DetailKeyFact {
  label: string;
  /**
   * Narrow-viewport form of `label`. On a phone the label and the value share
   * one line, so a long label ("POTENCIA INSTALADA") crowds out the very thing
   * it names. The full label still stands everywhere there is room for it.
   */
  shortLabel?: string;
  /** A string gets the strip's own value styling; a node renders as-is. */
  value: ReactNode;
  /**
   * Raw text to write to the clipboard. Its PRESENCE is what turns the copy
   * button on, so a field with no value simply omits it and renders its
   * placeholder with no control attached.
   */
  copyable?: string;
}

/**
 * At most three key facts, enforced by the type rather than trimmed at runtime:
 * a fourth fact is a call-site mistake, and silently dropping it would hide the
 * mistake instead of reporting it.
 */
export type DetailKeyFacts =
  | readonly []
  | readonly [DetailKeyFact]
  | readonly [DetailKeyFact, DetailKeyFact]
  | readonly [DetailKeyFact, DetailKeyFact, DetailKeyFact];

export interface DetailFact {
  label: string;
  value: ReactNode;
  /** Lets one field claim the whole row — notes, a description. */
  wide?: boolean;
}

/**
 * A list page's counter: a label and a figure.
 *
 * Deliberately not a `DetailKeyFact`. A counter is never an identifier, so it
 * has nothing to copy and no short form to fall back to — and saying that in
 * the type is better than trusting eight call sites to remember it.
 */
export interface ListKeyFact {
  label: string;
  value: ReactNode;
  /** Forbidden rather than absent, so passing one is reported, not ignored. */
  copyable?: never;
}

/** Up to three, capped by the type for the same reason `DetailKeyFacts` is. */
export type ListKeyFacts =
  | readonly [ListKeyFact]
  | readonly [ListKeyFact, ListKeyFact]
  | readonly [ListKeyFact, ListKeyFact, ListKeyFact];

export interface DetailVariantProps {
  /** The default. Named only so the union has something to discriminate on. */
  variant?: "detail";
  icon: ReactNode;
  title: ReactNode;
  /**
   * Focus target for a page that moves focus to the heading after an action
   * whose own control unmounts on success.
   */
  titleRef?: Ref<HTMLHeadingElement>;
  /** A node, so a consumer can make it a link. */
  subtitle?: ReactNode;
  /** Small leading mark for the subtitle — a location pin, a plant. */
  subtitleIcon?: ReactNode;
  status?: ReactNode;
  keyFacts?: DetailKeyFacts;
  details?: readonly DetailFact[];
  /** The "⋯" trigger and its menu. Visibility stays the consumer's business. */
  menu?: ReactNode;
  isLoading?: boolean;
  error?: unknown;
}

/**
 * The same header naming a LIST rather than an entity.
 *
 * A list page has no entity to disclose, no lifecycle to badge and no row to
 * act on, so the strip holds counters and nothing else — no toggle cell, and
 * all three cells stay in one row even at 390px, because a counter is short
 * enough to share a phone's width and the whole point is to stop the header
 * from pushing the list off the first viewport.
 *
 * The forbidden props are typed `never` rather than left out. On a bare union
 * TypeScript's excess-property check admits any key present in ANY member, so
 * omission alone would let `details` through silently; `never` fails at the
 * property itself, where the message is readable.
 */
export interface ListVariantProps {
  variant: "list";
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  keyFacts?: ListKeyFacts;
  details?: never;
  status?: never;
  menu?: never;
  titleRef?: never;
  subtitleIcon?: never;
  /** No list page gates its header: counters render as soon as they compute. */
  isLoading?: never;
  error?: never;
}

export type DetailHeaderProps = DetailVariantProps | ListVariantProps;

// ─── KeyFactCell ─────────────────────────────────────────────────────────────
// One cell of the strip, and the only place that knows whether its value has
// actually been clipped. It measures rather than infers: the rule is "repeat a
// value the reader cannot fully see", and only layout knows that.

const KeyFactCell: FC<{
  fact: DetailKeyFact;
  label: string;
  flex: Record<string, string | number>;
  isDivided: boolean;
  isCopied: boolean;
  onCopy: (fact: DetailKeyFact) => void;
  onTruncationChange: (label: string, isTruncated: boolean) => void;
}> = ({ fact, label, flex, isDivided, isCopied, onCopy, onTruncationChange }) => {
  const valueRef = useRef<HTMLDivElement | null>(null);
  const isCopyable = fact.copyable !== undefined;

  useEffect(() => {
    if (!isCopyable) return;
    const node = valueRef.current;
    if (!node) return;

    const measure = () => onTruncationChange(fact.label, node.scrollWidth > node.clientWidth);
    measure();

    // Re-measure on resize so rotating a phone, or dragging a window narrow,
    // adds or removes the repeat rather than leaving a stale answer behind.
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [fact.label, fact.value, isCopyable, onTruncationChange]);

  return (
    <Box
      sx={{
        // Equal columns on a wide strip; on a phone the cells are sized
        // by what they hold, so a short value is not truncated to make
        // room for a long one to have space to spare.
        flex,
        minWidth: 0,
        display: "flex",
        flexDirection: { xs: "row", sm: "column" },
        alignItems: { xs: "center", sm: "flex-start" },
        gap: { xs: 0.5, sm: 0.25 },
        px: { xs: 0.75, sm: 3 },
        py: { xs: 0.75, sm: 1.5 },
        ...(isDivided && { borderLeft: "1px solid", borderColor: colors.border.light }),
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: colors.text.subtle,
          // Uppercase on a wide strip, sentence case on a phone. The
          // caps cost about 15% of the label's width, which at 390px is
          // the difference between "Potencia" and "POTEN…". A label
          // that has to be truncated to stay upper case is not a label.
          textTransform: { xs: "none", sm: "uppercase" },
          fontWeight: 600,
          whiteSpace: "nowrap",
          // Exactly one of the label and the value gives way, and it is
          // never the designated one's counterpart. Where the value is
          // copyable it is already the thing built to truncate, so the
          // label holds; where it is not, the label yields, because a
          // figure squeezed out by the word naming it is worse than a
          // shortened word.
          flexShrink: isCopyable ? 0 : 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          maxWidth: "100%",
          flexShrink: isCopyable ? 1 : 0,
          // A floor for the value AND its copy button together. The
          // copyable cell is the one that gives way, and without this it
          // gave way entirely: clipped to a character and a half it
          // still cost strip width while telling the reader nothing.
          minWidth: isCopyable ? { xs: 72, sm: 0 } : 0,
        }}
      >
        <Typography
          ref={valueRef}
          variant="body2"
          component="div"
          sx={{
            fontWeight: 700,
            color: colors.text.primary,
            fontVariantNumeric: "tabular-nums",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {fact.value}
        </Typography>
        {isCopyable && (
          <IconButton
            size="small"
            onClick={() => void onCopy(fact)}
            aria-label={`Copiar ${fact.label}`}
            sx={{
              ...stripHitArea,
              flexShrink: 0,
              color: "primary.main",
              bgcolor: colors.brand.surface,
              borderRadius: radii.small,
              "&:hover": { bgcolor: colors.brand.surface },
            }}
          >
            {isCopied ? <CheckIcon sx={{ fontSize: 16 }} /> : <ContentCopyIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        )}
      </Box>
    </Box>
  );
};

export const DetailHeader: FC<DetailHeaderProps> = ({
  variant = "detail",
  icon,
  title,
  titleRef,
  subtitle,
  subtitleIcon,
  status,
  keyFacts,
  details,
  menu,
  isLoading = false,
  error = null,
}) => {
  const isList = variant === "list";
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down("sm"));
  const [areDetailsOpen, setAreDetailsOpen] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [truncatedLabels, setTruncatedLabels] = useState<Record<string, boolean>>({});
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const detailsId = useId();

  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  const handleTruncationChange = useCallback((label: string, isTruncated: boolean) => {
    setTruncatedLabels((current) => (current[label] === isTruncated ? current : { ...current, [label]: isTruncated }));
  }, []);

  const isResolved = !isLoading && !error;
  const hasSubtitle = subtitle !== undefined && subtitle !== null;
  const hasSubtitleRow = hasSubtitle || (isResolved && isCompact && Boolean(status));

  const facts: readonly DetailKeyFact[] = keyFacts ?? [];
  // On xs the strip holds two cells at most; anything beyond moves into the
  // details, where it is genuinely hidden and therefore genuinely counted.
  // The list strip displaces nothing: its counters are short enough that three
  // of them share a 390px row, and there is no disclosure to displace them into.
  const visibleFacts = isCompact && !isList ? facts.slice(0, 2) : facts;
  const displacedFacts = isCompact && !isList ? facts.slice(2) : [];

  const hiddenCount = displacedFacts.length + (details?.length ?? 0);
  const hasDisclosure = !isList && hiddenCount > 0;

  /**
   * A copyable value that has actually lost characters to an ellipsis is
   * repeated in full in the details. MEASURED, not assumed: treating every
   * copyable value on a narrow viewport as truncated printed the CUPS twice on
   * the supply header, where one key fact leaves the strip plenty of room and
   * nothing was ever clipped.
   *
   * A mirrored value is still on screen, so it is NOT part of the hidden count —
   * "+5" must mean five things you cannot currently see.
   */
  const mirroredFacts = hasDisclosure
    ? visibleFacts.filter((fact) => fact.copyable !== undefined && truncatedLabels[fact.label])
    : [];

  const detailItems: DetailFact[] = [
    ...displacedFacts.map((fact) => ({ label: fact.label, value: fact.value })),
    ...(details ?? []),
    ...mirroredFacts.map((fact) => ({ label: fact.label, value: fact.copyable as string, wide: true })),
  ];

  /**
   * Which cell gives way when the strip cannot fit a phone.
   *
   * The copyable one, always — it is repeated in full in the details precisely
   * because it truncates, and a clipped identifier still reads as an
   * identifier. A clipped NUMBER does not: "120,5 kW" cut to "1." is not a
   * smaller amount of truth, it is a different figure. So a non-copyable cell
   * keeps its content width and the copyable cell takes what is left, down to
   * the floor its value sets below.
   *
   * With no copyable value there is no such candidate, so the cells are sized
   * by what they hold and give way in proportion. Equal thirds are worse than
   * they look here: they hand the same width to a cell holding "45,00 kW" and
   * one holding "1 sept 2024", so the longer value eats its own label.
   */
  const stripHasCopyable = visibleFacts.some((fact) => fact.copyable !== undefined);
  const compactFlex = (fact: DetailKeyFact) =>
    stripHasCopyable ? (fact.copyable !== undefined ? "1 1 auto" : "0 0 auto") : "0 1 auto";

  const expandLabel = `Ver ${hiddenCount} dato${hiddenCount === 1 ? "" : "s"} más`;
  const collapseLabel = "Ocultar detalles";
  // The phone shows the bare count, but the accessible name stays the sentence:
  // "+5" read aloud says nothing about what it opens.
  const accessibleToggleLabel = areDetailsOpen ? collapseLabel : expandLabel;
  const visibleToggleLabel = isCompact ? `+${hiddenCount}` : accessibleToggleLabel;

  const handleCopy = async (fact: DetailKeyFact) => {
    try {
      await navigator.clipboard.writeText(fact.copyable as string);
    } catch {
      // An insecure context or a denied permission. Nothing reached the
      // clipboard, so neither the icon nor the live region may claim it did.
      return;
    }
    setCopiedLabel(fact.label);
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setCopiedLabel(null), COPY_FEEDBACK_MS);
  };

  return (
    <Paper
      elevation={0}
      // The anchor the visual suite measures the collapsed header against: the
      // 120px budget on a 390px viewport is the whole point of the redesign.
      data-testid={isList ? "list-header" : "detail-header"}
      sx={{
        // The shared panel surface, minus its padding: the strip and the details
        // are full-bleed inside the card, so each section pads itself.
        ...sxStyles.softPanel,
        p: 0,
        overflow: "hidden",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, px: { xs: 2, sm: 3 }, py: { xs: 1.25, sm: 3 } }}>
        <Box sx={{ display: "flex", flexShrink: 0, color: "primary.main", mt: 0.25 }}>{icon}</Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.25 }}>
            <Typography
              ref={titleRef}
              variant="h5"
              component="h1"
              tabIndex={titleRef ? -1 : undefined}
              sx={{
                typography: { xs: "h6", sm: "h5" },
                fontWeight: 700,
                lineHeight: 1.25,
                color: colors.text.primary,
                minWidth: 0,
                // Focused programmatically after an action, so the ring is
                // explicit rather than inherited.
                "&:focus-visible": {
                  outline: "2px solid",
                  outlineColor: colors.brand.main,
                  outlineOffset: "4px",
                },
              }}
            >
              {title}
            </Typography>
            {/* On a phone the badge joins the subtitle line instead: left in the
                title row it takes a whole line of its own the moment the name
                wraps, which is most names at 390px. */}
            {isResolved && !isCompact && status}
          </Box>

          {(hasSubtitleRow) && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                mt: 0.25,
                minWidth: 0,
                color: colors.text.subtle,
                "& .MuiSvgIcon-root": { fontSize: 18, flexShrink: 0 },
              }}
            >
              {isResolved && isCompact && status}
              {subtitleIcon}
              {subtitle !== undefined && subtitle !== null && (
                <Typography
                  variant="body2"
                  component="div"
                  // An entity's subtitle is an attribute and clips to one line;
                  // a list page's is a sentence describing the page, and
                  // ellipsising it mid-word would drop meaning the reader has
                  // no other way to recover.
                  sx={
                    isList
                      ? { minWidth: 0 }
                      : { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }
                  }
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
          )}
        </Box>

        {isResolved && menu && <Box sx={{ flexShrink: 0 }}>{menu}</Box>}
      </Box>

      {isResolved && (visibleFacts.length > 0 || hasDisclosure) && (
        <Box
          sx={{
            display: "flex",
            alignItems: "stretch",
            borderTop: "1px solid",
            borderColor: colors.divider,
            bgcolor: colors.background.surface,
          }}
        >
          {visibleFacts.map((fact, index) => (
            <KeyFactCell
              key={fact.label}
              fact={fact}
              label={(isCompact && fact.shortLabel) || fact.label}
              // Counters get equal columns everywhere. Sizing them by content,
              // as the detail strip does on a phone, is a rule about making
              // room for one long identifier — there is no such cell here, and
              // uneven thirds under a row of numbers just read as misalignment.
              flex={isList ? { xs: "1 1 0", sm: 1 } : { xs: compactFlex(fact), sm: 1 }}
              isDivided={index > 0}
              isCopied={copiedLabel === fact.label}
              onCopy={handleCopy}
              onTruncationChange={handleTruncationChange}
            />
          ))}

          {hasDisclosure && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                flexShrink: 0,
                // No padding on xs: the button carries its own, and doubling it
                // cost the strip 16px it does not have on a 390px screen.
                px: { xs: 0, sm: 2 },
                ...(visibleFacts.length > 0 && { borderLeft: "1px solid", borderColor: colors.border.light }),
              }}
            >
              <Button
                variant="text"
                size="small"
                onClick={() => setAreDetailsOpen((open) => !open)}
                aria-expanded={areDetailsOpen}
                aria-controls={detailsId}
                aria-label={accessibleToggleLabel}
                endIcon={
                  <ExpandMoreIcon
                    sx={{
                      fontSize: 18,
                      transform: areDetailsOpen ? "rotate(180deg)" : "none",
                      transition: "transform 200ms ease-out",
                    }}
                  />
                }
                sx={{
                  ...stripHitArea,
                  color: "primary.main",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  px: { xs: 0.75, sm: 1 },
                  "& .MuiButton-endIcon": { ml: 0.25 },
                }}
              >
                {visibleToggleLabel}
              </Button>
            </Box>
          )}
        </Box>
      )}

      {isResolved && hasDisclosure && (
        <Collapse in={areDetailsOpen} unmountOnExit>
          <Box
            id={detailsId}
            sx={{
              borderTop: "1px solid",
              borderColor: colors.border.light,
              bgcolor: colors.background.surface,
              px: { xs: 2, sm: 3 },
              py: { xs: 2, sm: 2.5 },
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
              gap: { xs: 2, sm: 2.5 },
            }}
          >
            {detailItems.map((item, index) => (
              <Box
                key={`${item.label}-${index}`}
                sx={{ minWidth: 0, ...(item.wide && { gridColumn: "1 / -1" }) }}
              >
                <Typography variant="caption" sx={{ color: colors.text.subtle, display: "block", mb: 0.25 }}>
                  {item.label}
                </Typography>
                <Typography
                  variant="body2"
                  component="div"
                  sx={{ fontWeight: 600, color: colors.text.primary, wordBreak: "break-word" }}
                >
                  {item.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Collapse>
      )}

      {/* Mounted once and left mounted, so a copy announces reliably rather than
          racing its own live region into the document. */}
      <ActionStatus message={copiedLabel ? `${copiedLabel} copiado al portapapeles` : ""} />
    </Paper>
  );
};
