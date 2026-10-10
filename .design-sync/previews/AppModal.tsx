import { AppModal, CommunityScopeHeader, Mui, Icons, alphas } from "conluz-web";

export const WithActions = () => (
  <AppModal
    isOpen
    onClose={() => {}}
    title="Nuevo acuerdo de reparto en Comunidad Energética Benimaclet"
    scopeHeader={<CommunityScopeHeader name="Comunidad Energética Benimaclet" />}
    icon={<Icons.HandshakeOutlined sx={{ fontSize: 28, color: "primary.main" }} />}
    iconBg={alphas.info.light}
    actions={
      <>
        <Mui.Button variant="outlined">Cancelar</Mui.Button>
        <Mui.Button variant="contained">Crear borrador</Mui.Button>
      </>
    }
  >
    <Mui.Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
      Se creará para <strong>Planta Polideportivo</strong> en estado <strong>Borrador</strong>. Desde ahí podrás
      adjuntar el fichero TXT de coeficientes o introducirlos a mano.
    </Mui.Typography>
    <Mui.TextField label="Nombre del acuerdo" defaultValue="Reparto 2026 · Planta Polideportivo" size="small" fullWidth />
  </AppModal>
);

export const Centered = () => (
  <AppModal
    isOpen
    onClose={() => {}}
    centered
    icon={<Icons.CheckCircle sx={{ fontSize: 40, color: "success.main" }} />}
    iconBg={alphas.success.light}
  >
    <Mui.Typography sx={{ color: "secondary.main", mb: 3 }}>
      Los coeficientes se han importado correctamente.
    </Mui.Typography>
    <Mui.Button variant="contained">Aceptar</Mui.Button>
  </AppModal>
);
