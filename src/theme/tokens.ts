export const colors = {
  brand: {
    main: "#667eea",
    dark: "#5568d3",
    contrastText: "#fff",
  },
  secondary: {
    main: "#475569",
    dark: "#1e293b",
  },
  success: "#10b981",
  error: "#ef4444",
  warning: "#f59e0b",
  text: {
    primary: "#1e293b",
    secondary: "#64748b",
  },
  divider: "#e5e7eb",
  background: {
    default: "#f5f7fa",
    // #f8fafc is a lighter table/surface shade used for TableRow headers and code blocks.
    // It is kept as a literal in those callsites for now; it will be promoted to a
    // named surface token in Phase 2 when all background tokens are consolidated.
    paper: "#ffffff",
  },
} as const;
