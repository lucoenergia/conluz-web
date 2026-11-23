import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar, Box, Checkbox, Chip } from "@mui/material";
import { fontSizes } from "../../theme/tokens";
import { RecordList, type RecordListItem } from "./RecordList";

const rowActions = { label: (item: RecordListItem) => `Más acciones para ${item.title}`, onClick: () => {} };

const initialAvatar = (name: string) => (
  <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main", fontSize: fontSizes.md }}>{name.charAt(0)}</Avatar>
);

const member = (id: string, name: string, email: string, role: string, enabled: boolean): RecordListItem => ({
  id,
  avatar: initialAvatar(name),
  title: name,
  status: (
    <Chip label={enabled ? "Activo" : "Inactivo"} color={enabled ? "success" : "error"} size="small" sx={{ fontWeight: 600 }} />
  ),
  fields: [
    { label: "Email", value: email },
    { label: "Rol", value: role },
  ],
});

const MEMBERS = [
  member("m-1", "Lucía Ferrer Puig", "lucia.ferrer@correo.es", "Administradora", true),
  member("m-2", "Joan Martínez Soler", "joan.martinez@correo.es", "Miembro", true),
  member("m-3", "Carmen Navarro Gil", "carmen.navarro@correo.es", "Miembro", false),
];

const meta = {
  title: "Layout/RecordList",
  component: RecordList,
  // The app draws a record list below 1024 px; a phone-width frame shows it as there.
  decorators: [
    (Story) => (
      <Box sx={{ maxWidth: 390 }}>
        <Story />
      </Box>
    ),
  ],
  args: { label: "Miembros de la comunidad", items: MEMBERS, rowActions },
} satisfies Meta<typeof RecordList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Members: Story = {};

export const WithBadge: Story = {
  args: {
    label: "Usuarios de la plataforma",
    items: [
      {
        ...member("u-1", "Vicent Ribes Climent", "vicent.ribes@correo.es", "Miembro", true),
        badge: <Chip label="Administrador de plataforma" size="small" variant="outlined" color="primary" />,
      },
    ],
  },
};

export const WithLines: Story = {
  args: {
    rowActions: { ...rowActions, has: (item) => item.id === "m-4" },
    items: [
      {
        id: "m-4",
        avatar: initialAvatar("Amparo"),
        title: "Amparo Domínguez Llorens",
        badge: <Chip label="Invitación enviada" size="small" sx={{ fontWeight: 600 }} />,
        lines: ["Miembro · 12345678Z", "amparo.dominguez.llorens.cooperativa@telefonica.net"],
        fields: [],
      },
      {
        id: "m-5",
        avatar: initialAvatar("Toni"),
        title: "Toni Esteve Cano",
        badge: <Chip label="Sin email" size="small" sx={{ fontWeight: 600 }} />,
        lines: ["Administrador · X1234567L"],
        fields: [],
      },
    ],
  },
};

export const Loading: Story = {
  args: { items: [], isLoading: true, rowActions: undefined },
};

export const WithSelection: Story = {
  args: {
    items: MEMBERS.map((item, index) => ({
      ...item,
      selection:
        index < 2 ? <Checkbox checked={index === 0} inputProps={{ "aria-label": `Seleccionar ${item.title}` }} /> : undefined,
    })),
  },
};

export const WithLinks: Story = {
  args: {
    label: "Puntos de suministro",
    chevron: true,
    rowActions: undefined,
    items: [
      { id: "s-1", title: "Casa de Lucía", href: "/supply-points/s-1", lines: ["ES0021000000000001AB"] },
      { id: "s-2", title: "Local de la cooperativa", href: "/supply-points/s-2", lines: ["ES0021000000000002CD"] },
      { id: "s-3", title: "Nave antigua", href: "/supply-points/s-3", lines: ["ES0021000000000003EF"], inactive: true },
    ],
  },
};
