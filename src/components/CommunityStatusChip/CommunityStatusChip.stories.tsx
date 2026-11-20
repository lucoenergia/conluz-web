import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Stack, Typography } from "@mui/material";
import { CommunityStatusChip, type CommunityStatus } from "./CommunityStatusChip";

const meta = {
  title: "Data display/CommunityStatusChip",
  component: CommunityStatusChip,
} satisfies Meta<typeof CommunityStatusChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Activa: Story = { args: { status: "Activa" } };

export const SinAdmin: Story = { args: { status: "Sin admin" } };

export const SinUsuarios: Story = { args: { status: "Sin usuarios" } };

export const Deshabilitada: Story = { args: { status: "Deshabilitada" } };

const COMMUNITIES: readonly (readonly [string, CommunityStatus])[] = [
  ["Comunidad Energética de Torrent", "Activa"],
  ["Sol de Benimaclet", "Sin admin"],
  ["Coop. Solar de Alzira", "Sin usuarios"],
  ["Renovables de Xàtiva", "Deshabilitada"],
];

export const AllStatuses: Story = {
  args: { status: "Activa" },
  render: () => (
    <Stack spacing={1.5}>
      {COMMUNITIES.map(([name, status]) => (
        <Box key={name} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 3, minWidth: 340 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {name}
          </Typography>
          <CommunityStatusChip status={status} />
        </Box>
      ))}
    </Stack>
  ),
};
