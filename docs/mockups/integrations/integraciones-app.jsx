/* global React, ReactDOM, MaterialUI */
const { useState, useMemo } = React;
const {
  AppBar, Toolbar, IconButton, Box, Typography, Drawer, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Paper, Avatar, TextField,
  Button, Switch, Chip, Snackbar, Alert, InputAdornment,
  ThemeProvider, createTheme, CssBaseline, Collapse, Breadcrumbs, Link,
  CircularProgress,
} = MaterialUI;

/* -------------------- Theme + tokens -------------------- */
const ACCENT_DEFAULT = "#667eea";

function buildTheme(accent) {
  return createTheme({
    palette: { primary: { main: accent }, background: { default: "#f5f7fa" } },
    typography: {
      fontFamily: '"Inter", system-ui, sans-serif',
      h4: { fontWeight: 700, letterSpacing: "-0.5px" },
      h6: { fontWeight: 600 },
      button: { textTransform: "none", fontWeight: 600 },
    },
    shape: { borderRadius: 8 },
  });
}

const MIcon = ({ name, size = 22, sx = {} }) => (
  <span className="material-icons-outlined" style={{ fontSize: size, lineHeight: 1, ...sx }}>{name}</span>
);

/* -------------------- Logo -------------------- */
const Logo = () => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
    <Box sx={{
      width: 40, height: 40, borderRadius: "50%",
      background: "linear-gradient(135deg, #f59e0b 0%, #eab308 100%)",
      boxShadow: "0 2px 8px rgba(245,158,11,0.3)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <MIcon name="wb_sunny" size={24} sx={{ color: "white" }} />
    </Box>
    <Typography variant="h6" sx={{
      fontWeight: 700,
      background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      letterSpacing: "-0.5px",
      display: { xs: "none", sm: "block" },
    }}>ConLuz</Typography>
  </Box>
);

/* -------------------- Header -------------------- */
const Header = ({ onMenuClick, username, accent }) => (
  <AppBar position="fixed" elevation={0} sx={{
    zIndex: (t) => t.zIndex.drawer + 1,
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
    boxShadow: "0 1px 3px 0 rgba(0,0,0,0.05)",
  }}>
    <Toolbar sx={{ px: { xs: 2, sm: 3 }, py: 1, justifyContent: "space-between" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <IconButton onClick={onMenuClick} sx={{ color: "#6b7280", "&:hover": { backgroundColor: "#f3f4f6" } }}>
          <MIcon name="menu" />
        </IconButton>
        <Logo />
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Typography sx={{ display: { xs: "none", sm: "block" }, color: "#374151", fontWeight: 500, fontSize: "0.9rem" }}>
          {username}
        </Typography>
        <Avatar sx={{ width: 36, height: 36, bgcolor: accent, fontSize: "0.85rem", fontWeight: 600 }}>
          {username.split(" ").map((s) => s[0]).join("").slice(0, 2)}
        </Avatar>
      </Box>
    </Toolbar>
  </AppBar>
);

/* -------------------- Side menu -------------------- */
const SIDEMENU_WIDTH = 260;
const MENU_ITEMS = [
  { id: "home", label: "Inicio", icon: "home" },
  { id: "supply", label: "Puntos de suministro", icon: "bolt" },
  { id: "production", label: "Producción", icon: "solar_power" },
  { id: "partners", label: "Socios", icon: "groups" },
  { id: "integrations", label: "Integraciones", icon: "extension", selected: true },
  { id: "contact", label: "Contacto", icon: "mail_outline" },
];

const SideMenu = ({ open, onClose, variant, accent }) => (
  <Drawer
    variant={variant}
    open={open}
    onClose={() => onClose(false)}
    sx={{
      "& .MuiDrawer-paper": {
        width: SIDEMENU_WIDTH, boxSizing: "border-box",
        borderRight: "1px solid #e5e7eb", background: "#ffffff",
        boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)",
      },
    }}
  >
    <Toolbar />
    <List sx={{ px: 2, pt: 2 }}>
      {MENU_ITEMS.map((m) => (
        <ListItem key={m.id} disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            selected={!!m.selected}
            sx={{
              borderRadius: 2, px: 2.5, py: 1.5,
              "&.Mui-selected": {
                background: accent,
                "& .MuiListItemIcon-root": { color: "#fff" },
                "& .MuiListItemText-primary": { color: "#fff", fontWeight: 600 },
                "&:hover": { background: accent, filter: "brightness(0.92)" },
              },
              "&:not(.Mui-selected)": {
                "&:hover": { backgroundColor: "#f8fafc" },
                "& .MuiListItemIcon-root": { color: "#6b7280" },
                "& .MuiListItemText-primary": { color: "#374151" },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <MIcon name={m.icon} />
            </ListItemIcon>
            <ListItemText primary={m.label} primaryTypographyProps={{ fontSize: "0.9rem", fontWeight: m.selected ? 600 : 500 }} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  </Drawer>
);

/* -------------------- Breadcrumb -------------------- */
const PageBreadcrumb = ({ accent }) => (
  <Box sx={{
    p: { xs: 1.5, sm: 2 }, background: "#fff", borderRadius: 2,
    boxShadow: "0 2px 8px 0 rgba(0,0,0,0.08)", overflow: "auto",
  }}>
    <Breadcrumbs separator={<MIcon name="navigate_next" size={18} sx={{ color: "#94a3b8" }} />}>
      <Link href="#" underline="none" sx={{
        display: "flex", alignItems: "center", color: "#475569",
        "&:hover": { color: accent },
      }}>
        <MIcon name="home" size={18} sx={{ marginRight: 4 }} />
        <Typography variant="body2" sx={{ fontWeight: 500 }}>Inicio</Typography>
      </Link>
      <Chip
        label={
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <MIcon name="extension" size={18} sx={{ marginRight: 4, color: "#fff" }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: "#fff" }}>Integraciones</Typography>
          </Box>
        }
        sx={{ background: accent, color: "white", height: 28, "& .MuiChip-label": { px: 2 } }}
      />
    </Breadcrumbs>
  </Box>
);

/* -------------------- Hero -------------------- */
const PageHero = ({ accent }) => (
  <Paper elevation={0} sx={{
    p: { xs: 2, sm: 3 },
    borderRadius: { xs: 0, sm: 3 },
    background: accent,
    color: "white",
  }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)", width: 56, height: 56 }}>
        <MIcon name="extension" size={32} sx={{ color: "white" }} />
      </Avatar>
      <Box>
        <Typography variant="h4">Integraciones</Typography>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          Conecta servicios externos para sincronizar datos de consumo y producción
        </Typography>
      </Box>
    </Box>
  </Paper>
);

/* -------------------- Status chip -------------------- */
const StatusChip = ({ status }) => {
  const map = {
    connected:    { bg: "#dcfce7", fg: "#166534", icon: "check_circle", label: "Conectado" },
    disconnected: { bg: "#fee2e2", fg: "#991b1b", icon: "cancel",       label: "Desconectado" },
    unconfigured: { bg: "#f1f5f9", fg: "#475569", icon: "help_outline", label: "Sin configurar" },
    disabled:     { bg: "#f1f5f9", fg: "#64748b", icon: "do_not_disturb_on", label: "Deshabilitado" },
  };
  const s = map[status];
  return (
    <Chip
      icon={<span className="material-icons-outlined" style={{ fontSize: 16, color: s.fg }}>{s.icon}</span>}
      label={s.label}
      sx={{
        bgcolor: s.bg, color: s.fg, fontWeight: 600, fontSize: "0.75rem",
        height: 26, borderRadius: "13px",
        "& .MuiChip-icon": { color: s.fg, ml: "8px" },
      }}
    />
  );
};

/* -------------------- Provider mark (icon "logo") -------------------- */
const ProviderMark = ({ icon, color }) => (
  <Box sx={{
    width: 48, height: 48, borderRadius: 2,
    background: `${color}15`, color: color,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  }}>
    <MIcon name={icon} size={26} sx={{ color }} />
  </Box>
);

/* -------------------- Field overrides for accent -------------------- */
const fieldSx = (accent) => ({
  "& .MuiOutlinedInput-root": {
    "&:hover fieldset": { borderColor: accent },
    "&.Mui-focused fieldset": { borderColor: accent },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: accent },
});

/* -------------------- Integration card -------------------- */
function IntegrationCard({ provider, accent, value, onChange, onSave, density }) {
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);

  const enabled = value.enabled;
  const hasCreds = provider.fields.includes("credentials");

  const status = !enabled
    ? "disabled"
    : hasCreds
      ? (value.username && value.password ? "connected" : "unconfigured")
      : "connected";

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
    onSave(provider.id);
  };

  const padY = density === "compact" ? 2 : 3;

  return (
    <Paper elevation={0} sx={{
      borderRadius: { xs: 2, sm: 3 },
      bgcolor: "white",
      boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
      overflow: "hidden",
      transition: "box-shadow .2s",
      "&:hover": { boxShadow: "0 6px 24px 0 rgba(0,0,0,0.10)" },
    }}>
      {/* Header row */}
      <Box sx={{
        display: "flex", alignItems: { xs: "flex-start", sm: "center" },
        gap: 2, p: { xs: 2, sm: padY },
        flexDirection: { xs: "column", sm: "row" },
      }}>
        <ProviderMark icon={provider.icon} color={provider.color} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#111827" }}>
              {provider.name}
            </Typography>
            <StatusChip status={status} />
          </Box>
          <Typography variant="body2" sx={{ color: "#6b7280", mt: 0.5 }}>
            {provider.description}
          </Typography>
        </Box>
        <Box sx={{
          display: "flex", alignItems: "center", gap: 1,
          alignSelf: { xs: "flex-end", sm: "center" },
        }}>
          <Typography variant="body2" sx={{ color: "#6b7280", fontWeight: 500 }}>
            {enabled ? "Habilitado" : "Deshabilitado"}
          </Typography>
          <Switch
            checked={enabled}
            onChange={(e) => onChange(provider.id, { enabled: e.target.checked })}
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked": { color: accent },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: accent },
            }}
          />
        </Box>
      </Box>

      {/* Body — only for providers with credentials */}
      {hasCreds && (
        <Collapse in={enabled} timeout={250}>
          <Box sx={{
            px: { xs: 2, sm: padY }, pb: { xs: 2, sm: padY }, pt: 0,
            borderTop: "1px dashed #e5e7eb",
          }}>
            <Box sx={{ pt: { xs: 2, sm: padY } }}>
              <Box sx={{
                display: "grid", gap: 2,
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              }}>
                <TextField
                  label="Usuario"
                  value={value.username}
                  onChange={(e) => onChange(provider.id, { username: e.target.value })}
                  fullWidth variant="outlined" size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MIcon name="person_outline" size={20} sx={{ color: "#9ca3af" }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={fieldSx(accent)}
                />
                <TextField
                  label="Contraseña"
                  type={showPwd ? "text" : "password"}
                  value={value.password}
                  onChange={(e) => onChange(provider.id, { password: e.target.value })}
                  fullWidth variant="outlined" size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MIcon name="lock_outline" size={20} sx={{ color: "#9ca3af" }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowPwd((v) => !v)} edge="end">
                          <MIcon name={showPwd ? "visibility_off" : "visibility"} size={20} sx={{ color: "#9ca3af" }} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={fieldSx(accent)}
                />
                <TextField
                  label="URL del servicio"
                  placeholder={provider.urlPlaceholder}
                  value={value.url}
                  onChange={(e) => onChange(provider.id, { url: e.target.value })}
                  fullWidth variant="outlined" size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MIcon name="link" size={20} sx={{ color: "#9ca3af" }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ ...fieldSx(accent), gridColumn: { xs: "auto", sm: "1 / -1" } }}
                />
              </Box>

              {/* Helper / docs link */}
              <Box sx={{
                mt: 2, display: "flex", alignItems: "center", gap: 1,
                color: "#6b7280",
              }}>
                <MIcon name="info_outline" size={16} sx={{ color: "#9ca3af" }} />
                <Typography variant="caption" sx={{ color: "#6b7280" }}>
                  {provider.help}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, mt: 2.5, flexWrap: "wrap" }}>
                <Button
                  variant="outlined"
                  startIcon={<MIcon name="cable" size={18} />}
                  sx={{
                    borderColor: "#e5e7eb", color: "#475569", borderRadius: "6px",
                    "&:hover": { borderColor: accent, color: accent, backgroundColor: `${accent}0a` },
                  }}
                >
                  Probar conexión
                </Button>
                <Button
                  variant="contained"
                  disabled={saving}
                  onClick={handleSave}
                  startIcon={saving
                    ? <CircularProgress size={16} sx={{ color: "white" }} />
                    : <MIcon name="save" size={18} />}
                  sx={{
                    background: accent, borderRadius: "6px", px: 3,
                    boxShadow: "0 2px 4px 0 rgba(0,0,0,0.12)",
                    "&:hover": { background: accent, filter: "brightness(0.95)", boxShadow: "0 4px 8px 0 rgba(0,0,0,0.16)" },
                  }}
                >
                  {saving ? "Guardando…" : "Guardar"}
                </Button>
              </Box>
            </Box>
          </Box>
        </Collapse>
      )}

      {/* Shelly: no credentials, just a thin save row when toggled */}
      {!hasCreds && (
        <Box sx={{
          px: { xs: 2, sm: padY }, pb: { xs: 2, sm: padY }, pt: 0,
          display: "flex", justifyContent: "flex-end",
        }}>
          <Button
            variant="contained"
            disabled={saving}
            onClick={handleSave}
            startIcon={saving
              ? <CircularProgress size={16} sx={{ color: "white" }} />
              : <MIcon name="save" size={18} />}
            sx={{
              background: accent, borderRadius: "6px", px: 3,
              boxShadow: "0 2px 4px 0 rgba(0,0,0,0.12)",
              "&:hover": { background: accent, filter: "brightness(0.95)" },
            }}
          >
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </Box>
      )}
    </Paper>
  );
}

/* -------------------- Page -------------------- */
const PROVIDERS = [
  {
    id: "datadis", name: "Datadis", icon: "electric_meter", color: "#0ea5e9",
    description: "Plataforma oficial de las distribuidoras eléctricas para acceder a datos de consumo de los socios.",
    fields: ["credentials"],
    urlPlaceholder: "https://datadis.es/api-private",
    help: "Necesitas una cuenta dada de alta en datadis.es con permiso de consulta de los CUPS de la comunidad.",
  },
  {
    id: "huawei", name: "Huawei", icon: "solar_power", color: "#dc2626",
    description: "Conexión con inversores Huawei para recoger datos de producción de las plantas fotovoltaicas.",
    fields: ["credentials"],
    urlPlaceholder: "https://eu5.fusionsolar.huawei.com/thirdData",
    help: "Usa una cuenta de tipo Northbound API. Confirma con tu instalador la región correcta del endpoint.",
  },
  {
    id: "shelly", name: "Shelly Cloud", icon: "sensors", color: "#10b981",
    description: "Lecturas en tiempo real desde dispositivos Shelly instalados en la comunidad. No requiere credenciales adicionales.",
    fields: [],
  },
];

function IntegrationsPage({ accent, density }) {
  const [state, setState] = useState({
    datadis: { enabled: true,  username: "comunidad@luco.energy", password: "••••••••••", url: "https://datadis.es/api-private" },
    huawei:  { enabled: true,  username: "luco_api",              password: "",            url: "https://eu5.fusionsolar.huawei.com/thirdData" },
    shelly:  { enabled: false, username: "", password: "", url: "" },
  });
  const [snack, setSnack] = useState(null);

  const update = (id, patch) => setState((s) => ({ ...s, [id]: { ...s[id], ...patch } }));
  const save = (id) => setSnack(`${PROVIDERS.find((p) => p.id === id).name} guardado correctamente`);

  return (
    <Box data-screen-label="Integraciones" sx={{
      display: "flex", flexDirection: "column",
      gap: { xs: 2, sm: 3 }, p: { xs: 0, sm: 2, md: 3 },
      minHeight: "calc(100vh - 64px)",
      background: "#f5f7fa",
    }}>
      <Box sx={{ px: { xs: 2, sm: 0 }, width: "100%" }}>
        <PageBreadcrumb accent={accent} />
      </Box>

      <PageHero accent={accent} />

      {/* Summary strip */}
      <Box sx={{ px: { xs: 2, sm: 0 }, width: "100%", maxWidth: 960, mx: "auto" }}>
        <Paper elevation={0} sx={{
          p: { xs: 1.5, sm: 2 }, borderRadius: 2,
          bgcolor: "white", boxShadow: "0 2px 8px 0 rgba(0,0,0,0.06)",
          display: "flex", alignItems: "center", gap: { xs: 1.5, sm: 3 },
          flexWrap: "wrap",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <MIcon name="bolt" size={18} sx={{ color: "#10b981" }} />
            <Typography variant="body2" sx={{ color: "#374151", fontWeight: 500 }}>
              {Object.values(state).filter((v) => v.enabled).length} de {PROVIDERS.length} integraciones activas
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />          
        </Paper>
      </Box>

      {/* Cards stack */}
      <Box sx={{
        px: { xs: 2, sm: 0 }, width: "100%", maxWidth: 960, mx: "auto",
        display: "flex", flexDirection: "column", gap: { xs: 2, sm: 2.5 },
      }}>
        {PROVIDERS.map((p) => (
          <IntegrationCard
            key={p.id}
            provider={p}
            accent={accent}
            density={density}
            value={state[p.id]}
            onChange={update}
            onSave={save}
          />
        ))}
      </Box>

      <Snackbar
        open={!!snack}
        autoHideDuration={3500}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setSnack(null)} sx={{ borderRadius: "6px", fontWeight: 500 }}>
          {snack}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/* -------------------- App shell -------------------- */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#667eea",
  "density": "regular",
  "menuOpenDesktop": true
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = ["#667eea", "#0ea5e9", "#10b981", "#f59e0b"];

function App() {
  const [t, setTweak] = (window.useTweaks || ((d) => [d, () => {}]))(TWEAK_DEFAULTS);
  const accent = t.accent || ACCENT_DEFAULT;
  const theme = useMemo(() => buildTheme(accent), [accent]);

  // Track viewport
  const [width, setWidth] = useState(window.innerWidth);
  React.useEffect(() => {
    const fn = () => setWidth(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  const isDesktop = width >= 900;
  const variant = isDesktop ? "persistent" : "temporary";

  const [open, setOpen] = useState(t.menuOpenDesktop && isDesktop);
  React.useEffect(() => {
    setOpen(t.menuOpenDesktop && isDesktop);
  }, [isDesktop, t.menuOpenDesktop]);

  const contentMargin = open && isDesktop ? SIDEMENU_WIDTH : 0;

  const TP = window.TweaksPanel;
  const TS = window.TweakSection;
  const TC = window.TweakColor;
  const TR = window.TweakRadio;
  const TT = window.TweakToggle;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", background: "#f5f7fa" }}>
        <Header onMenuClick={() => setOpen((v) => !v)} username="Ana Pérez" accent={accent} />
        <SideMenu open={open} onClose={setOpen} variant={variant} accent={accent} />
        <Box component="main" sx={{
          marginLeft: `${contentMargin}px`,
          transition: "margin 225ms cubic-bezier(0,0,0.2,1) 0ms",
        }}>
          <Toolbar />
          <IntegrationsPage accent={accent} density={t.density} />
        </Box>

        {TP && (
          <TP title="Tweaks">
            <TS label="Apariencia" />
            <TC label="Color de acento" value={accent} options={ACCENT_OPTIONS}
                onChange={(v) => setTweak("accent", v)} />
            <TR label="Densidad" value={t.density} options={["compact", "regular"]}
                onChange={(v) => setTweak("density", v)} />
            <TS label="Layout" />
            <TT label="Menú abierto (escritorio)" value={t.menuOpenDesktop}
                onChange={(v) => setTweak("menuOpenDesktop", v)} />
          </TP>
        )}
      </Box>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
