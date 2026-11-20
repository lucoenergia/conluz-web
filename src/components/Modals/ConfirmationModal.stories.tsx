import type { Meta, StoryObj } from "@storybook/react-vite";
import { Typography } from "@mui/material";
import { CommunityScopeHeader } from "../CommunityScopeHeader/CommunityScopeHeader";
import { ConfirmationModal } from "./ConfirmationModal";

const meta = {
  title: "Dialogs/ConfirmationModal",
  component: ConfirmationModal,
  args: {
    isOpen: true,
    onCancel: () => {},
    onConfirm: () => {},
    confirmLabel: "Guardar",
    confirmColor: "primary",
    title: "Guardar integración en Comunidad Energética Benimaclet",
    scopeHeader: <CommunityScopeHeader name="Comunidad Energética Benimaclet" />,
    children: (
      <Typography sx={{ color: "text.secondary", lineHeight: 1.6 }}>
        La configuración de <strong>Datadis</strong> se guardará en <strong>Comunidad Energética Benimaclet</strong> y
        sustituirá la que tenga ahora esta comunidad.
      </Typography>
    ),
  },
} satisfies Meta<typeof ConfirmationModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};

export const Pending: Story = {
  args: { confirmDisabled: true, confirmPending: true, inFlight: true },
};
