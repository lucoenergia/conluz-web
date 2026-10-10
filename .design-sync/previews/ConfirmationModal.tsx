import { ConfirmationModal, CommunityScopeHeader, Mui } from "conluz-web";

const Body = () => (
  <Mui.Typography sx={{ color: "text.secondary", lineHeight: 1.6 }}>
    La configuración de <strong>Datadis</strong> se guardará en <strong>Comunidad Energética Benimaclet</strong> y
    sustituirá la que tenga ahora esta comunidad.
  </Mui.Typography>
);

export const Open = () => (
  <ConfirmationModal
    isOpen
    onCancel={() => {}}
    onConfirm={() => {}}
    confirmLabel="Guardar"
    confirmColor="primary"
    title="Guardar integración en Comunidad Energética Benimaclet"
    scopeHeader={<CommunityScopeHeader name="Comunidad Energética Benimaclet" />}
  >
    <Body />
  </ConfirmationModal>
);

export const Pending = () => (
  <ConfirmationModal
    isOpen
    onCancel={() => {}}
    onConfirm={() => {}}
    confirmLabel="Guardar"
    confirmColor="primary"
    confirmDisabled
    confirmPending
    title="Guardar integración en Comunidad Energética Benimaclet"
    scopeHeader={<CommunityScopeHeader name="Comunidad Energética Benimaclet" />}
  >
    <Body />
  </ConfirmationModal>
);
