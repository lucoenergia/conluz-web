import type { FC, ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import PersonOffRoundedIcon from "@mui/icons-material/PersonOffRounded";
import GroupOffRoundedIcon from "@mui/icons-material/GroupOffRounded";
import DomainDisabledRoundedIcon from "@mui/icons-material/DomainDisabledRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import DomainAddRoundedIcon from "@mui/icons-material/DomainAddRounded";
import { colors } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { EmptyState } from "../../components/EmptyState";
import { PlatformKpiCard } from "../../components/PlatformKpiCard";
import { CommunityStatusChip } from "../../components/CommunityStatusChip";
import { AttentionPanel, type AttentionItem } from "../../components/AttentionPanel";
import { deriveStatus, usePlatformOverview } from "./usePlatformOverview";

const COMMUNITIES_LIST_ROUTE = "/communities";
const CREATE_COMMUNITY_ROUTE = "/communities/new";
const USERS_ROUTE = "/users";
const PREVIEW_LIMIT = 5;

const communityWord = (n: number) => (n === 1 ? "comunidad" : "comunidades");

interface KpiDef {
  key: string;
  label: string;
  value: number;
  sublabel: string;
}

export const PlatformPage: FC = () => {
  const navigate = useNavigate();
  const {
    kpis,
    attention,
    communities,
    usersCount,
    usersCountUnavailable,
    isLoading,
    error,
  } = usePlatformOverview();

  const kpiCards: KpiDef[] = [
    {
      key: "communities",
      label: "Comunidades",
      value: kpis.communities,
      sublabel: `${kpis.communitiesWithUsers} con usuarios · ${kpis.communitiesWithoutUsers} sin usuarios`,
    },
    {
      key: "supply-points",
      label: "Puntos de suministro",
      value: kpis.supplyPoints,
      sublabel: "suma de todas las comunidades",
    },
    // Usuarios is dropped when the users count could not be fetched (e.g. 403).
    ...(usersCountUnavailable
      ? []
      : [
          {
            key: "users",
            label: "Usuarios",
            value: usersCount,
            sublabel: "personas distintas",
          },
        ]),
    {
      key: "members",
      label: "Socios",
      value: kpis.members,
      sublabel: "membresías (suma por comunidad)",
    },
  ];

  const attentionItems: AttentionItem[] = [];
  if (attention.withoutAdmin > 0) {
    attentionItems.push({
      key: "without-admin",
      icon: <PersonOffRoundedIcon fontSize="small" />,
      label: `${attention.withoutAdmin} ${communityWord(attention.withoutAdmin)} sin administrador`,
      to: COMMUNITIES_LIST_ROUTE,
    });
  }
  if (attention.withoutUsers > 0) {
    attentionItems.push({
      key: "without-users",
      icon: <GroupOffRoundedIcon fontSize="small" />,
      label: `${attention.withoutUsers} ${communityWord(attention.withoutUsers)} sin usuarios`,
      to: COMMUNITIES_LIST_ROUTE,
    });
  }
  if (attention.disabled > 0) {
    attentionItems.push({
      key: "disabled",
      icon: <DomainDisabledRoundedIcon fontSize="small" />,
      label: `${attention.disabled} ${communityWord(attention.disabled)} deshabilitada${
        attention.disabled === 1 ? "" : "s"
      }`,
      to: COMMUNITIES_LIST_ROUTE,
    });
  }

  const previewCommunities = communities.slice(0, PREVIEW_LIMIT);

  let body: ReactNode;
  if (isLoading) {
    body = (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  } else if (error) {
    body = (
      <Alert severity="error">
        Error al cargar la información de la plataforma. Por favor, intente de nuevo.
      </Alert>
    );
  } else if (communities.length === 0) {
    body = (
      <EmptyState
        icon={DomainAddRoundedIcon}
        title="Crea tu primera comunidad energética"
        subtitle="Aún no hay comunidades en la plataforma. Empieza creando una para comenzar a gestionarla."
        actionButton={{
          label: "Crear comunidad",
          startIcon: <AddRoundedIcon />,
          onClick: () => navigate(CREATE_COMMUNITY_ROUTE),
        }}
      />
    );
  } else {
    body = (
      <>
        {/* KPI row — 4 (or 3 when Usuarios is unavailable) light cards */}
        <Box
          sx={{
            display: "grid",
            gap: { xs: 2, sm: 3 },
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              md: `repeat(${kpiCards.length}, minmax(0, 1fr))`,
            },
          }}
        >
          {kpiCards.map((card) => (
            <PlatformKpiCard
              key={card.key}
              label={card.label}
              value={card.value}
              sublabel={card.sublabel}
            />
          ))}
        </Box>

        <AttentionPanel items={attentionItems} />

        {/* Quick actions — one primary only */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Button
            variant="contained"
            component={Link}
            to={CREATE_COMMUNITY_ROUTE}
            startIcon={<AddRoundedIcon />}
          >
            Crear comunidad
          </Button>
          <Button
            variant="outlined"
            component={Link}
            to={USERS_ROUTE}
            startIcon={<ManageAccountsRoundedIcon />}
          >
            Gestionar usuarios
          </Button>
          <Button
            variant="outlined"
            component={Link}
            to={USERS_ROUTE}
            startIcon={<AdminPanelSettingsRoundedIcon />}
          >
            Otorgar admin
          </Button>
        </Stack>

        {/* Communities preview */}
        <Paper elevation={0} sx={sxStyles.softPanel}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography sx={{ fontWeight: 600, color: colors.text.primary }}>Comunidades</Typography>
            <Button
              component={Link}
              to={COMMUNITIES_LIST_ROUTE}
              variant="text"
              size="small"
              endIcon={<ChevronRightRoundedIcon />}
              sx={{ color: "primary.main" }}
            >
              Ver todas
            </Button>
          </Box>

          {/* Desktop table */}
          <TableContainer sx={{ display: { xs: "none", sm: "block" } }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: colors.background.surface }}>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                      Nombre
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                      Socios
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                      Suministros
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                      Estado
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewCommunities.map((community) => (
                  <TableRow key={community.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {community.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ color: "secondary.main" }}>
                        {community.memberCount ?? 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ color: "secondary.main" }}>
                        {community.supplyPointCount ?? 0}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <CommunityStatusChip status={deriveStatus(community)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Mobile stacked cards */}
          <Box sx={{ display: { xs: "flex", sm: "none" }, flexDirection: "column", gap: 1.5 }}>
            {previewCommunities.map((community) => (
              <Box
                key={community.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                  py: 1,
                  borderBottom: `1px solid ${colors.divider}`,
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {community.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: colors.text.secondary }}>
                    {community.memberCount ?? 0} socios · {community.supplyPointCount ?? 0} suministros
                  </Typography>
                </Box>
                <CommunityStatusChip status={deriveStatus(community)} />
              </Box>
            ))}
          </Box>
        </Paper>
      </>
    );
  }

  return (
    <Box
      sx={{
        ...sxStyles.pageContainer,
        p: { xs: 2, sm: 3, md: 4 },
        maxWidth: 1200,
        mx: "auto",
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2, sm: 3 },
      }}
    >
      <Box>
        <Typography variant="h4" gutterBottom sx={{ color: colors.text.primary }}>
          Administración de plataforma
        </Typography>
        <Typography sx={{ color: colors.text.subtle }}>
          Vista general del estado de la plataforma.
        </Typography>
      </Box>

      {body}
    </Box>
  );
};
